# BRAAZA / validação da primeira versão

Node.js: 16 testes passaram. Navegador: 25 verificações passaram, com Chromium/WebGL2/HDR em desktop 1440x900 e toque emulado 390x844. O relatório está em browser-tests.json. A carga do navegador foi feita com os módulos reais via Blob URLs, sem mocks de renderização, porque navegação local é bloqueada no ambiente de teste.

Verificado: correntes opostas, scroll, arraste, seleção sem drag de texto, clique e fechamento de mídia, teclado, Home, modo leve, pausa, redução de movimento, raycast, toque e ausência de overflow horizontal. Todos os pixels dos buffers HDR e bloom verificados eram finitos. Não houve erro JavaScript/GLSL/WebGL nesses cenários.

Correções durante os testes: `pow` com base fora do intervalo criou NaNs no material; agora as bases de Fresnel são limitadas. O desfoque de profundidade agora considera a câmera mobile. Home zera a navegação imediatamente. O caminho dos elos fecha sem degrau.

Os quatro trabalhos são demos procedurais explicitamente rotuladas. Não foi possível validar reprodução dos vídeos reais do Braaza, pois essas mídias ainda não foram fornecidas. Desempenho em dispositivos físicos e Safari/Firefox não foi medido nesta rodada. A concept orienta a composição; este relatório não afirma identidade pixel a pixel.
