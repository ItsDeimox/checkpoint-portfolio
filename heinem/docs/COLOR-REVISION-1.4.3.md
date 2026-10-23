# HEINEM 1.4.3: Frutiger Aero vivo, sem neon

## Problema observado
O usuário aprovou o direcionamento verde-azulado, mas a 1.4.2 ficou **morta**, sem contraste e vitalidade. O erro foi interpretar “menos colorido” como “quase cinza”: a grama precisava ter luz e sombras naturais, não perder o relevo cromático.

## Leitura da fotografia de referência
A referência fornecida em 23/10/2026 (1920×1080 px) contém céu azul-acinzentado, nuvens com brancos luminosos, gramado com sombras densas e folhas verdes bem definidas. Uma amostra de pixels classificada por matiz (sem modelos de visão externa) trouxe aproximadamente:
- Céu azul, região superior: matiz mediana **208°**, saturação HSV mediana **0,33**, valor mediano **0,65**.
- Folhagem/grama da região inferior: matiz mediana **98°**, saturação HSV mediana **0,57**, valor mediano **0,27** (há ampla faixa de valores de claro a escuro).

Estas medianas se referem à **imagem fornecida**, e não aos assets individuais do projeto. Não há relação linear entre saturação HSV da referência e parâmetro CSS sobre outra fonte fotográfica.

## Calibração implantada
| Plano | Saturação CSS | Hue | Brilho | Contraste |
| --- | ---: | ---: | ---: | ---: |
| Céu | 0,86 | -2° | 0,98 | 1,035 |
| Árvore e folhagens | 0,74 | 13° | 0,99 | 1,02 |
| Gramado frontal contínuo | 0,79 | 13° | 0,99 | 1,025 |

O fundo de fallback passa a `#415d50`. A 1.4.2 usava saturação 0,56-0,63, brilho .92 e contraste abaixo de 1 nas plantas, achatando cor e luminosidade. A revisão 1.4.3 devolve gradações verde/ciano e a legibilidade do brilho solar, mas mantém saturação abaixo dos assets crus.

## Shader e impacto
O shader já compõe as fontes do ambiente separadamente. A refração foi recalibrada *in-place* nos parâmetros `gradeGarden`, sem nova textura, passe extra, leitura do DOM, modificação do mesh ou mudança na física da bolha. A implementação de color grade GLSL é uma **aproximação tonal**, não uma cópia pixel a pixel do filtro CSS `hue-rotate`.

## Preservações e aceitação
Retrato, tipografia, CD, borboletas, interações e render budget permanecem iguais. O panorama e o campo continuam um só gramado ao rolar. A regressão de browser exige saturação e contraste em faixas que preservam vitalidade; o aceite visual final continua baseado na referência e em dispositivo real. Publicação exclusivamente por GitHub → Vercel integrado e conferência do SHA.

Esta revisão substitui como orientação ativa os números da 1.4.1 e da 1.4.2, que continuam documentados como histórico.
