# Publicação no GitHub Pages

## Requisitos

- Git instalado.
- Permissão de escrita no repositório.
- Repositório público para GitHub Free, ou um plano que permita Pages no tipo de repositório escolhido.
- GitHub Actions habilitado.

## Primeira publicação

1. Crie um repositório dedicado no GitHub.
2. Cole a URL HTTPS no Checkpoint Portfolio.
3. Edite o conteúdo e selecione `Publicar alterações`.
4. Se o GitHub CLI estiver autenticado, o app tenta habilitar Pages automaticamente.
5. Sem o GitHub CLI, o app abre `Settings > Pages`; selecione `GitHub Actions` em `Source` uma única vez.

As publicações seguintes acontecem automaticamente após cada push criado pelo aplicativo.

## Endereço esperado

- Projeto comum: `https://USUARIO.github.io/REPOSITORIO/`
- Repositório `USUARIO.github.io`: `https://USUARIO.github.io/`

## Solução de problemas

- Verifique a aba `Actions` do repositório.
- Confirme que a origem do Pages está configurada como `GitHub Actions`.
- Confirme que o e-mail do autor do commit está verificado no GitHub.
- Verifique se Git e o gerenciador de credenciais estão autenticados.

