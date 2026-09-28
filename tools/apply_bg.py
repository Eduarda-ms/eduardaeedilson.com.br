from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8')

# Remove tentativas antigas de fundo para evitar conflito.
text = re.sub(r'<style>\s*/\* ===== FUNDO FINAL - IDENTIDADE VISUAL ===== \*/.*?<!-- ===== FIM FUNDO FINAL - IDENTIDADE VISUAL ===== -->\s*', '', text, flags=re.S)
text = re.sub(r'<style>\s*/\* ===== FUNDO REAL - IDENTIDADE VISUAL ===== \*/.*?<!-- ===== FIM FUNDO REAL - IDENTIDADE VISUAL ===== -->\s*', '', text, flags=re.S)
text = re.sub(r'<style>\s*/\* ===== FUNDO COM A IDENTIDADE VISUAL ===== \*/.*?</style>\s*', '', text, flags=re.S)
text = re.sub(r'<style>\s*/\* ===== ESTAMPA FINAL DO SITE ===== \*/.*?<!-- ===== FIM ESTAMPA FINAL DO SITE ===== -->\s*', '', text, flags=re.S)
text = re.sub(r'<script>\s*/\* ===== SCRIPT FUNDO REAL - IDENTIDADE VISUAL ===== \*/.*?</script>\s*', '', text, flags=re.S)
text = text.replace('<div id="fundoIdentidade" aria-hidden="true"></div>\n', '')

# Remove duas regras antigas soltas que brigavam com o fundo novo.
text = re.sub(r'html,body,body\.site-identidade\{background-color:#f8e9e2!important;background-image:url\("\./identidade-visual\.webp"\)!important;background-repeat:repeat!important;background-size:440px auto!important;background-position:center top!important;\}\s*', '', text)
text = re.sub(r'body\.site-identidade main,body\.site-identidade section:not\(\.hero\):not\(\.countdown-section\)\{background-color:transparent!important;\}\s*', '', text)

img = 'https://raw.githubusercontent.com/Eduarda-ms/eduardaeedilson.com.br/main/identidade-visual.webp?v=20260927-2'

css = f'''
<style>
/* ===== ESTAMPA FINAL DO SITE ===== */
html,
body,
body.site-identidade {{
  background-color:#f8eee8 !important;
  background-image:url("{img}") !important;
  background-repeat:repeat !important;
  background-position:center top !important;
  background-size:720px auto !important;
}}

/* A capa permanece somente com o vídeo. */
body.site-identidade .hero {{
  background:none !important;
  background-image:none !important;
}}

/* A estampa é aplicada diretamente em todas as áreas abaixo da capa. */
body.site-identidade .countdown-section,
body.site-identidade section:not(.hero),
body.site-identidade .papel-section,
body.site-identidade .historia,
body.site-identidade .grande-dia,
body.site-identidade .presentes,
body.site-identidade .lista-presentes,
body.site-identidade .informacoes,
body.site-identidade .rsvp,
body.site-identidade .galeria,
body.site-identidade .final {{
  background-color:#f8eee8 !important;
  background-image:url("{img}") !important;
  background-repeat:repeat !important;
  background-position:center top !important;
  background-size:720px auto !important;
}}

/* Evita que pseudo-camadas lisas escondam a estampa. */
body.site-identidade section:not(.hero)::before,
body.site-identidade section:not(.hero)::after {{
  background-color:transparent !important;
}}

/* Caixas continuam claras para leitura. */
body.site-identidade .convite-box,
body.site-identidade .ornamental-card,
body.site-identidade .countdown-inner,
body.site-identidade .presente-card,
body.site-identidade .final .container {{
  background:rgba(255,249,245,.94) !important;
}}

@media (max-width:650px) {{
  html,
  body,
  body.site-identidade,
  body.site-identidade .countdown-section,
  body.site-identidade section:not(.hero) {{
    background-size:430px auto !important;
  }}
}}
</style>
<!-- ===== FIM ESTAMPA FINAL DO SITE ===== -->
'''

text = text.replace('</head>', css + '\n</head>', 1)
p.write_text(text, encoding='utf-8')
