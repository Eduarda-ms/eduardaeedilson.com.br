/**
 * RESERVAS DE PRESENTES — Eduarda e Edilson
 * Projeto separado do Apps Script RSVP, para não interromper as confirmações.
 * Planilha: Lista_Convidados_Eduarda_Edilson
 * Aba: Presentes reservados
 *
 * Publique como: Implantar > Nova implantação > Aplicativo da Web
 * Executar como: Eu. Acesso: Qualquer pessoa.
 * Copie o URL /exec para RESERVAS_API_URL em reserva-presentes.js.
 *
 * Não altere o projeto Apps Script já usado para RSVP.
 */
const RESERVAS_PLANILHA_ID = '1yEzOXuX0UDDpPga7GOwQqVVD8X0ivgRtUiynv001Uzo';
const RESERVAS_ABA = 'Presentes reservados';

function reservasAba_() {
  const aba = SpreadsheetApp.openById(RESERVAS_PLANILHA_ID).getSheetByName(RESERVAS_ABA);
  if (!aba) throw new Error('A aba Presentes reservados não foi encontrada');
  return aba;
}
function reservasRegistros_(aba) {
  const last = aba.getLastRow();
  if (last < 2) return [];
  return aba.getRange(2,1,last-1,6).getValues().map((r,i)=>({
    linha:i+2, data:r[0], nomePresente:String(r[1]), pessoa:String(r[2]),
    status:String(r[3]), id:String(r[4]), token:String(r[5])
  }));
}
function reservasAtivas_(registros) {
  const ativos = {};
  registros.forEach(r => {
    if (r.id) {
      if (r.status === 'Reservado') ativos[r.id] = r;
      if (r.status === 'Cancelado') delete ativos[r.id];
    }
  });
  return ativos;
}
function reservasJsonp_(e, obj) {
  const callback = String(e.parameter.callback || '');
  if (!/^[A-Za-z_$][\w$]{0,79}$/.test(callback)) {
    return ContentService.createTextOutput(JSON.stringify({erro:'Callback inválido'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(callback+'('+JSON.stringify(obj)+');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function doGet(e) {
  try {
    const params=e.parameter || {};
    const ativos=reservasAtivas_(reservasRegistros_(reservasAba_()));
    const acao=String(params.acao || '');
    if (acao==='status') {
      return reservasJsonp_(e,{ok:true,reservados:Object.keys(ativos)});
    }
    if (acao==='verificar') {
      const id=String(params.id||'');
      const token=String(params.token||'');
      const registro=ativos[id];
      return reservasJsonp_(e,{
        ok:true, situacao:!registro?'livre':registro.token===token?'minha':'ocupada'
      });
    }
    return reservasJsonp_(e,{ok:false,erro:'Ação inválida'});
  } catch(err) {
    return reservasJsonp_(e,{ok:false,erro:'Serviço indisponível'});
  }
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(10000)) return ContentService.createTextOutput('ocupado');
  try {
    const p=e.parameter||{};
    const acao=String(p.acao||'');
    const id=String(p.id||'').slice(0,180);
    const token=String(p.token||'').slice(0,128);
    const nome=String(p.nome||'').trim().slice(0,100);
    const presente=String(p.presente||'').trim().slice(0,250);
    if (!id || !/^[a-z0-9-]+$/.test(id) || !/^[a-f0-9-]{30,65}$/.test(token)) {
      return ContentService.createTextOutput('invalido');
    }
    const aba=reservasAba_();
    const ativos=reservasAtivas_(reservasRegistros_(aba));
    if (acao==='reservar') {
      if (!nome || !presente) return ContentService.createTextOutput('invalido');
      if (ativos[id]) return ContentService.createTextOutput('ocupado');
      aba.appendRow([new Date(),presente,nome,'Reservado',id,token]);
      return ContentService.createTextOutput('reservado');
    }
    if (acao==='cancelar') {
      if (!ativos[id] || ativos[id].token!==token) {
        return ContentService.createTextOutput('nao_autorizado');
      }
      aba.appendRow([new Date(),ativos[id].nomePresente,ativos[id].pessoa,'Cancelado',id,token]);
      return ContentService.createTextOutput('cancelado');
    }
    return ContentService.createTextOutput('acao_invalida');
  } catch(err) {
    return ContentService.createTextOutput('erro');
  } finally {
    lock.releaseLock();
  }
}
