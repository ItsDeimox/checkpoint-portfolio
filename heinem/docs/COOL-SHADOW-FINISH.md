# HEINEM: acabamento azulado nas sombras

## Pedido e escopo (23/10/2026)
O usuário pediu o acabamento um pouco mais azulado da referência e grama um pouco mais escura. A saturação da revisão 1.4.3 já estava próxima; não se pediu outra dessaturação geral. Esta correção sobre a 1.4.3 preserva os parâmetros de céu, folhagens, gramado e o shader aprovado e acrescenta apenas uma transformação de cor final.

## Implementação
`src/lib/scene-finish.ts` instala uma única definição SVG `garden-cool-finish` no documento, em sRGB. O tratamento é ativado por atributo somente após a definição existir. A folha `src/scene-finish.css` o aplica depois dos filtros existentes nos planos do céu, vegetações, árvore, campo contínuo e canvas da bolha. O retrato, as capas, os controles e o texto HTML não recebem filtro global. A cópia visual dentro do canvas recebe a transformação junto do filme; branco puro continua branco.

Matriz RGBA, aplicada após a composição de cada plano:

```text
1.06 0    0    0 -0.06
0    1.04 0    0 -0.04
0    0    0.98 0  0.02
0    0    0    1  0
```

A subtração moderada de vermelho/verde escurece os meios-tons. Azul recebe uma pequena compensação nas sombras. Cada linha RGB soma 1 para uma entrada branca, portanto o acabamento não transforma nuvens e letras brancas em ciano. Alpha permanece inalterado. O filtro é estático: nenhum RAF, listener, recálculo de texto, nova textura WebGL ou blur foi acrescentado. **O compositor do navegador ainda processa o filtro; isto não é custo GPU zero nem benchmark de FPS físico.**

`main.ts` instala o efeito antes da bolha e o remove no encerramento normal, preservando o contrato existente de back-forward cache. Sem JavaScript, sem o host ou sem as definições, o grade anterior continua disponível. As dimensões, o parallax, o carrossel e os arquivos de mídia não foram alterados.

## Evidência antes de publicar
Candidato validado: `ffd228da1cd11f59141c6d850eb92207ac88f133`, na branch isolada `heinem/cool-tone-validation`. Workflow [39928626645](https://github.com/ItsDeimox/checkpoint-portfolio/actions/runs/39928626645), concluído com sucesso: instalação, TypeScript, testes unitários, build de produção, regressões de grade e de acabamento e captura da página renderizada.

O teste de navegador verifica os pixels reais de uma amostra RGB(40,65,38), que passa a aproximadamente RGB(27,57,42), com tolerância de um nível, e verifica que branco permanece RGB(255,255,255). Testes unitários cobrem também alpha, instalação única e teardown. A amostra local sem tratamento falhou no critério de escurecimento; com a matriz passou. Isso testa a operação, não prova igualdade à fotografia de referência.

As capturas reais de antes/depois foram inspecionadas em 1440 × 810 e a composição móvel em 390 × 844. Chrome 155.0.8059.39, ANGLE/SwiftShader, movimento reduzido para a comparação. Nenhum erro de página foi registrado. Em uma máscara reproduzível dos verdes abaixo de y=660 na captura desktop (G>1.1R e G>1.1B), a luminância média sRGB ponderada caiu de 0.42185 para 0.39957; a mediana B−R passou de −0.15294 para −0.10196. São números da captura do site, não da referência, e não equivalem a luminância física.

As capturas e runtime.json estão no artefato `heinem-tone-comparison` desse workflow, com retenção de três dias. A branch contém um workflow de QA específico que não integra esta publicação. O código de runtime e os testes publicados são os mesmos do candidato validado. Os testes focados não são reapresentados como execução integral de todos os testes do navegador; streaming real do SoundCloud e FPS em equipamento físico não foram medidos.

## Publicação
Somente commit na main e integração Git da Vercel. A evidência de aprovação acima é pré-publicação; a entrega deve confirmar separadamente READY, SHA e alias público. Não há upload ou deploy manual paralelo.
