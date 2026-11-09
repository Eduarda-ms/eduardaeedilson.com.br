/* Reserva de presentes para entrega pessoal.
 * Preencha esta URL somente após publicar o Apps Script ReservasPresentes.gs.
 * Se estiver vazia, a opção NÃO aparece no site (evita reservas falsas).
 */
const RESERVAS_API_URL = "";

(() => {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(RESERVAS_API_URL)) return;
  if (typeof presentes === "undefined") return;

  const presentesFisicos = presentes.filter(item => !!item.link);
  const grade = document.getElementById("presentes-grid");
  if (!grade) return;
  const cards = [...grade.querySelectorAll(".presente-card")];
  const idDoPresente = item => item.nome.normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,170);

  const estilo = document.createElement("style");
  estilo.textContent = [
    ".reserva-acao[hidden],.reserva-etiqueta[hidden],.reserva-cancelar[hidden]{display:none!important}",
    ".reserva-acao{display:block;width:100%;margin-top:9px;padding:11px 9px;border:1px solid #c95f4c;border-radius:20px;background:transparent;color:#9f5043;font:600 12px Montserrat,Arial,sans-serif;cursor:pointer}",
    ".reserva-acao:disabled{opacity:.65;cursor:not-allowed}",
    ".reserva-etiqueta{display:block;text-align:center;margin-top:12px;padding:10px 8px;border-radius:10px;background:#f4ece6;color:#815b4d;font:600 12px Montserrat,Arial,sans-serif}",
    ".reserva-cancelar{display:block;margin:8px auto 0;background:transparent;border:0;text-decoration:underline;color:#815b4d;cursor:pointer;font:12px Montserrat,Arial,sans-serif}",
    ".reserva-modal{position:fixed;z-index:10005;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:20px}",
    ".reserva-modal.aberto{display:flex}",
    ".reserva-caixa{position:relative;box-sizing:border-box;width:100%;max-width:440px;border-radius:22px;padding:28px;background:#fffaf7;text-align:center;box-shadow:0 16px 45px #0002}",
    ".reserva-caixa h3{font:26px Georgia,serif;color:#9f5043;margin:0 20px 13px}",
    ".reserva-caixa input{box-sizing:border-box;width:100%;padding:12px;margin:12px 0;border:1px solid #d7c8bc;border-radius:10px;font:16px Arial,sans-serif}",
    ".reserva-caixa button.confirmar{width:100%;padding:13px;border:0;border-radius:22px;background:#9f5043;color:white;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer}",
    ".reserva-caixa .fechar{position:absolute;right:16px;top:12px;font-size:26px;border:0;background:transparent;cursor:pointer}",
    ".reserva-msg{font:14px/1.5 Arial,sans-serif;color:#6e5e54;min-height:20px}",
    ".reserva-caixa small{display:block;margin-top:11px;color:#78665d;line-height:1.5}"
  ].join("\n");
  document.head.appendChild(estilo);

  const modal = document.createElement("div");
  modal.className = "reserva-modal";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-label","Reservar presente para entrega pessoal");
  modal.innerHTML = '<div class="reserva-caixa"><button class="fechar" type="button" aria-label="Fechar">×</button><h3>Vou entregar pessoalmente</h3><p id="reservaProduto"></p><label for="reservaNome">Seu nome</label><input id="reservaNome" maxlength="100" autocomplete="name" placeholder="Como podemos identificar você?"><button id="reservarAgora" class="confirmar" type="button">Confirmar reserva</button><p class="reserva-msg" id="reservaMsg" aria-live="polite"></p><small>Reservar não realiza nenhuma compra. Se mudar de ideia, você poderá cancelar neste aparelho.</small></div>';
  document.body.appendChild(modal);
  const nomeInput = document.getElementById("reservaNome");
  const reservaMsg = document.getElementById("reservaMsg");
  const btnEnviar = document.getElementById("reservarAgora");
  let selecionado = null;
  let ocupados = new Set();
  let carregado = false;
  let consultaSequencia = 0;
  let bloqueado = false;

  function chave(id) { return "reserva-presente:"+id; }
  function meuToken(id) { try{return localStorage.getItem(chave(id))||"";}catch(e){return "";}}
  function salvarToken(id,token) { try{localStorage.setItem(chave(id),token);}catch(e){} }
  function apagarToken(id) { try{localStorage.removeItem(chave(id));}catch(e){} }
  function novoToken() {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const b = new Uint8Array(20);
    crypto.getRandomValues(b);
    return Array.from(b,n=>n.toString(16).padStart(2,"0")).join("");
  }
  function jsonp(params) {
    return new Promise((resolve,reject)=>{
      const callback = "retornoReserva"+(++consultaSequencia);
      const script = document.createElement("script");
      const url = new URL(RESERVAS_API_URL);
      Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
      url.searchParams.set("callback",callback);
      let finalizado = false;
      const limpar = () => {clearTimeout(timer);script.remove();delete window[callback];};
      const timer = setTimeout(()=>{if(!finalizado){finalizado=true;limpar();reject(new Error("Sem resposta"));}},12000);
      window[callback] = resposta => {if(!finalizado){finalizado=true;limpar();resolve(resposta);}};
      script.onerror = () => {if(!finalizado){finalizado=true;limpar();reject(new Error("Falha de rede"));}};
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }
  function enviar(acao,id,token,nome,presente) {
    const dados = new URLSearchParams({acao,id,token,nome,presente});
    return fetch(RESERVAS_API_URL,{method:"POST",mode:"no-cors",body:dados,keepalive:true});
  }
  function fechar(){modal.classList.remove("aberto");selecionado=null;reservaMsg.textContent="";}
  modal.querySelector(".fechar").addEventListener("click",fechar);
  modal.addEventListener("click",e=>{if(e.target===modal)fechar()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")fechar()});

  const itens = [];
  presentes.forEach((p,i)=>{
    if (!p.link || !cards[i]) return;
    const id = idDoPresente(p);
    const botao = document.createElement("button");
    botao.type="button";botao.className="reserva-acao";
    botao.textContent="VOU ENTREGAR PESSOALMENTE";
    botao.disabled=true;
    const selo = document.createElement("div");
    selo.className="reserva-etiqueta";selo.hidden=true;
    const cancelar = document.createElement("button");
    cancelar.type="button";cancelar.className="reserva-cancelar";
    cancelar.textContent="Cancelar minha reserva";cancelar.hidden=true;
    const zona=cards[i].querySelector(".presente-info")||cards[i];
    zona.append(botao,selo,cancelar);
    const item={id,nome:p.nome,botao,selo,cancelar,card:cards[i]};
    itens.push(item);
    botao.addEventListener("click",()=>{
      if(!carregado || ocupados.has(id)) return;
      selecionado=item;
      document.getElementById("reservaProduto").textContent=p.nome;
      nomeInput.value="";reservaMsg.textContent="";
      modal.classList.add("aberto");nomeInput.focus();
    });
    cancelar.addEventListener("click",()=>cancelarReserva(item));
  });

  function desenhar() {
    itens.forEach(item=>{
      const ocupado=ocupados.has(item.id);
      item.botao.hidden=ocupado;
      item.botao.disabled=!carregado||bloqueado;
      item.selo.hidden=!ocupado;
      item.cancelar.hidden=!ocupado||!meuToken(item.id);
      if (ocupado) item.selo.textContent="PRESENTE RESERVADO";
    });
  }
  async function atualizar() {
    try{
      const dados=await jsonp({acao:"status"});
      if (!dados.ok || !Array.isArray(dados.reservados)) throw Error("Resposta inválida");
      ocupados=new Set(dados.reservados);carregado=true;desenhar();
      return true;
    }catch(err){carregado=false;desenhar();return false;}
  }
  const esperar=ms=>new Promise(r=>setTimeout(r,ms));
  async function verificar(id,token,estado) {
    for(let tentativa=0;tentativa<6;tentativa++){
      await esperar(tentativa===0?1200:1500);
      try {
        const r=await jsonp({acao:"verificar",id,token});
        if (r.ok && r.situacao===estado) return true;
        if (r.ok && r.situacao==="ocupada" && estado==="minha") return false;
      }catch(e){}
    }
    return false;
  }
  btnEnviar.addEventListener("click",async()=>{
    if(!selecionado||bloqueado)return;
    const nome=nomeInput.value.trim();
    if(nome.length<2){reservaMsg.textContent="Informe seu nome para reservar.";return;}
    const item=selecionado;
    const token=novoToken();
    bloqueado=true;btnEnviar.disabled=true;reservaMsg.textContent="Registrando sua reserva...";
    try {
      await atualizar();
      if(!carregado){reservaMsg.textContent="Serviço temporariamente indisponível. Tente mais tarde.";return;}
      if(ocupados.has(item.id)){reservaMsg.textContent="Este presente já está reservado.";return;}
      await enviar("reservar",item.id,token,nome,item.nome);
      const sucesso=await verificar(item.id,token,"minha");
      await atualizar();
      if (sucesso) {
        salvarToken(item.id,token);
        desenhar();
        reservaMsg.textContent="Presente reservado! Obrigada pelo carinho. 🤍";
        setTimeout(fechar,2300);
      } else {
        reservaMsg.textContent=ocupados.has(item.id)
          ?"Alguém já reservou este presente. Escolha outro, por favor."
          :"Não conseguimos confirmar a reserva. Tente novamente.";
      }
    }catch(e){reservaMsg.textContent="Não foi possível registrar. Tente novamente.";}
    finally {bloqueado=false;btnEnviar.disabled=false;desenhar();}
  });
  async function cancelarReserva(item) {
    if(!confirm("Deseja cancelar sua reserva de "+item.nome+"?"))return;
    const token=meuToken(item.id);
    if(!token)return;
    item.cancelar.disabled=true;
    try{
      await enviar("cancelar",item.id,token,"",item.nome);
      const ok=await verificar(item.id,token,"livre");
      if(ok){apagarToken(item.id);await atualizar();alert("Reserva cancelada.");}
      else {alert("Não foi possível confirmar o cancelamento. Tente novamente.");}
    }catch(e){alert("Não foi possível cancelar agora. Tente novamente.");}
    finally{item.cancelar.disabled=false;}
  }
  atualizar();
  setInterval(atualizar,45000);
})();
