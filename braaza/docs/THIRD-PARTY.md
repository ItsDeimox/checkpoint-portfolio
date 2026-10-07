# Origem dos recursos

Nenhuma biblioteca externa de renderização ou shader foi adicionada ao runtime. Os módulos GLSL desta entrega são os shaders autorais recuperados da tentativa anterior deste mesmo projeto; a base JavaScript deriva do commit `f0e603c`.

A única imagem de ambiente usada no runtime é `assets/world/far-vista-right.webp`: recorte 162 x 254 da concept gerada e aprovada nesta conversa. O manifesto ao lado registra SHA-256 da fonte, região e máscara. Ele mostra somente a torre/céu distante no vão do arco, sobre uma superfície com profundidade; não é a composição inteira nem contém os cards centrais. Seu WebP é reconstruído byte a byte durante o build a partir de oito fragmentos Base64 versionados em `tools/packed-vista`.

O resto da arquitetura é geometria gerada pelos scripts em `src/world/`; chama, lava, centelhas, materiais e demos são procedurais. HTML, CSS, identidade e os quatro conteúdos originais foram preservados.

Playwright, Chromium, Python e Node são ferramentas de desenvolvimento/teste, não assets incorporados ao site. As referências técnicas listadas no plano orientaram os sistemas; não se afirma ter copiado código de fontes cuja licença não foi registrada.
