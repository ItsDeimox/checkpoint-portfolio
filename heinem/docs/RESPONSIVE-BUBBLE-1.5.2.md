# HEINEM 1.5.2 — ancoragem da bolha sem conflito com parallax

## Causa raiz
A v1.5.1 colocava a bolha em top:52% e dependia de transform:translateY(-50%) para centralizá-la. O controlador de parallax escreve element.style.transform = translate3d(...) a cada atualização, substituindo a transformação de centragem. A bolha ficou parcialmente fora da tela: em 2048×1010 o topo estava em y≈525 em vez da posição desejada.

## Correção
O centramento vertical usa agora a propriedade individual CSS translate: 0 -50%, que compõe com transform de parallax sem conflito. O pivô desktop é top:40% e tablet em paisagem top:43%, preservando os limites de tamanho por svh/vw, aspect-ratio, tipografia em GPU, o layout mobile e os efeitos já aprovados.

## Validação
Nova regressão em tests/browser/bubble-anchor.spec.ts verifica a geometria do hero e do texto em seis configurações, redimensionamento sem navegação, transform inline ativo, ausência de corte e overflow, layout mobile e uniform WebGL uBackdropCount=2 para os dois cenários (céu e grama). Prova geométrica preliminar no Chromium com o parallax simulado: em 2048×1010 a bolha passou de y525 a y108; em 1440×700, de y364 a y72. Também medidos 1440×900, 960×720, 800×700, 1280×560 e 390×844. O teste CSS não é medição de FPS, nem substitui a suíte WebGL no GitHub Actions.

## Preservações
Shader de refração do gramado existente, lettering/bloom branco, marca H enviada pelo artista, leve grade chuvoso do retrato, campo único contínuo, player/CD, redução de movimento e opções gráficas. Publicar via commit GitHub → deploy Vercel e validar SHA, nunca upload paralelo.
