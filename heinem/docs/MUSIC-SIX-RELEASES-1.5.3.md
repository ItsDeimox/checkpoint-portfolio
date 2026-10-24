# HEINEM 1.5.3 — novas faixas e carrossel de seis CDs

## Origem do pedido
Alinhar a logo H mais à esquerda e acrescentar exatamente os links enviados pelo usuário:
- https://soundcloud.com/heinemstrange/dont-let-me-fall
- https://soundcloud.com/heinemstrange/jvke-her-feat-annika-wells
- https://soundcloud.com/heinemstrange/seven-lions-brieanna-grace

## Implementação
- Mover somente a marca com margem esquerda negativa responsiva, preservando header e navbar.
- Os três primeiros registros mantêm seus IDs/capas/durações. Os novos registros usam o permalink oficial como fonte do iframe. A duração desconhecida começa em 0:00 e é substituída pelo valor real informado pelo widget.
- O controle do CD suporta agora seis índices cíclicos. A capa selecionada e seus dois vizinhos são visíveis; outras capas são ocultadas com opacidade e não recebem eventos de ponteiro nem foco de teclado. Os cards entram e saem gradualmente enquanto o disco recolhe e troca.
- Os três novos lançamentos recebem um design de capa neutro feito com CSS, sem fingir que é arte oficial. Depois de iniciar o player, o widget pode fornecer a URL da arte autorizada e substituir o placeholder.
- O arraste horizontal permanece contínuo; a seleção do provedor acontece apenas quando o gesto termina. Nenhuma requisição ao SoundCloud ocorre antes de ação de reprodução.

## Notas de verificação
Unitários cobrem seis faixas, wrap anterior/próximo, sobreposição de capas, URLs dos embeds e ausência de conexões antecipadas. Os testes de navegador verificam navegação pelos seis títulos e regressões dos CDs existentes. Reprodução contínua depende de permissões do SoundCloud.

## Deploy
GitHub main é a fonte da verdade e a Vercel publica pelo vínculo Git após o commit. Conferir o SHA de produção antes de declarar a atualização pública.
