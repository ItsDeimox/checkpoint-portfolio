# Critérios de aceitação propostos

Metas a negociar e validar. Não são resultados alcançados nem garantias.

Conteúdo: arquivo autorizado e versionado para cada peça; revisor técnico do cliente aprova proporções, versões, interiores e textos. Lacunas saem do escopo ou ficam identificadas, nunca preenchidas com estruturas inventadas. Comparar capturas de todas as vistas aprovadas em desktop/mobile.

Hardware: Android de entrada/intermediário, iPhone/Safari, Windows com GPU integrada/dedicada, macOS/Safari. Registrar aparelho, SO, navegador, resolução, DPR, rede, qualidade, tempo de carregamento, frame-times p50/p95, memória e erros. Pelo menos cinco execuções frias/quentes por cenário e 15 minutos de interação. Confirmar pausa da renderização em repouso.

Meta inicial sugerida: 30 fps sustentados no perfil mobile acordado, 60 fps no desktop acordado. Confirmar viabilidade antes de assumir compromisso. Tempo de carregamento depende de assets e rede definidos. Chromium em nuvem por CPU não representa o celular do usuário.

Acessibilidade: teclado sem armadilhas, foco visível, diálogos, redução de movimento, alternativa sem WebGL, zoom da página, contraste e testes com NVDA/VoiceOver. Axe automatizado não certifica WCAG. Referência: https://www.w3.org/TR/WCAG22/

Publicação: testes/build com lockfile, integridade dos assets, limites de tamanho, créditos, revisão de alertas de dependências, recuperação de erro, iframe com origem aprovada, nenhum rastreamento externo por padrão, revisão de segurança proporcional ao contrato, SHA/deploy rastreáveis e rollback conhecido.
