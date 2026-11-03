# Validação e correções | 03/11/2026

Base: `26c513f9b5771e05842b11d8669c4e947572ed59`. Escopo: apenas SpaceX Fan Concept. Modelos, texturas, iluminação e shaders aprovados não foram substituídos.

## Defeitos reproduzidos e corrigidos

O duplo clique restaurava a orientação, mas mantinha o zoom anterior. Agora usa a mesma operação de reset do teclado e da integração: zoom padrão, pose inicial e descarte do movimento pendente, sem trocar o módulo selecionado.

Ao substituir a variante Baixo/Alto ou recalcular o enquadramento após redimensionamento, `applyState` reaplicava a pose padrão. Agora preserva o quaternion escolhido quando o componente continua o mesmo. Selecionar outro componente ainda usa a orientação de apresentação correspondente; reset explícito ainda retorna à pose inicial. O modo interno existente permanece ativo durante trocas de qualidade.

As regressões foram escritas antes do patch: três falhavam e uma já passava. Após a correção, as quatro passaram. Há testes de navegador para cápsula, motor individual e conjunto de motores, com mouse, teclado, retrato/paisagem e movimento normal/reduzido.

## Validação realizada

- 123 testes de código; build e limites de tamanho aprovados.
- 104 verificações na versão compilada: 12 de retenção/reset, 4 de erro/retry dos motores, 8 de modelos detalhados, 15 de movimento, 14 de integração/acessibilidade, 15 de estruturas internas existentes e 36 distribuídas entre Chromium, Firefox e WebKit.
- 12 GLBs, nas variantes high/eco, sem erros ou avisos do Khronos glTF Validator 2.0.0-dev.3.10. O validador recebe cópias decodificadas sem perdas; o stream comprimido continua coberto pelos hashes e comparações de atributos/imagens do pipeline existente. Nenhum arquivo de modelo foi regravado nesta auditoria.
- Os 13 registros de modelos/environment mantêm exatamente os hashes anteriores. Nenhuma peça, tampa ou interior foi gerado.
- Auditoria npm das dependências do aplicativo: zero vulnerabilidades conhecidas no momento da execução. Isso não é certificação de segurança.
- Testes automatizados de acessibilidade sem violações nos estados examinados, incluindo motor individual. Contraste sobre o canvas e leitores de tela reais continuam exigindo inspeção manual.

O resumo legível por máquina está em `2026-11-03-validation-summary.json`. A captura do módulo após rotação/reset foi inspecionada. Testes completos são reproduzíveis pelas instruções em `scripts/qa/README.md`.

## Ferramentas aplicadas

Context7 consultado na versão exata Three.js r180, não r186. Firecrawl usado para conferir páginas originais de candidatos. Khronos Validator foi adicionado somente ao pacote opcional de QA; não entra no download do visitante nem altera as dependências de produção. Nenhuma extensão, permissão local ou conta externa foi modificada.

Referências técnicas:
- https://github.com/mrdoob/three.js/blob/r180/manual/en/responsive.html
- https://github.com/KhronosGroup/glTF-Validator

## Novos foguetes e interiores: requisito ainda aberto

Validade do formato e origem consistente não demonstram que um tanque, cabine ou motor tem interior completo. Não houve inclusão de novos foguetes nesta rodada.

O F9R de TweetTweetPewPew no BlendSwap não documenta interiores de tanques/motores e apresenta CC-BY na página, enquanto a descrição declara CC0. O guia Falcon 1-M1 do Morethan3D não estabeleceu, na evidência obtida, uma licença para redistribuir o arquivo em WebGL nem a cobertura interna necessária. Não foram comprados arquivos, aceitos termos em nome do usuário ou enviados pedidos a autores. Essas observações não significam que modelos adequados não existam.

Fontes verificadas:
- https://blendswap.com/blend/12111
- https://morethan3d.com/how-to-print-assemble-the-falcon-1-m1/

## Limites

Chromium 141/156, Firefox 157 sob Xvfb e WebKit 27.2 em Linux com renderização por software. Não são ensaios em aparelhos físicos, nem Safari distribuído pela Apple, nem o Brave local do usuário. Permanecem abertos: fidelidade técnica de engenharia, interiores ausentes, dois foguetes adicionais qualificados, testes físicos, avaliação manual de acessibilidade e revisão de direitos/contrato. A publicação só deve ser anunciada depois de verificar SHA, READY e domínio público.
