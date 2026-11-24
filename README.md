# TaskQuest

*Your corporate journey.* Uma to-do list inspirada em games de NES: cada tarefa é uma **quest**, com dificuldade, prazo final e contagem regressiva. Você joga como num controle: direcional + Z + X.

- **Jogar no navegador:** https://kiyosonoda.github.io/taskquest/
- **Baixar para o Windows:** [TaskQuest.zip](https://github.com/kiyosonoda/taskquest/releases/latest/download/TaskQuest.zip)

Tudo começa zerado para cada pessoa: o progresso fica salvo só no navegador de quem joga.

## Instalar no Windows (10 ou 11)

1. Baixe o **TaskQuest.zip**, clique com o botão direito nele e escolha **"Extrair tudo..."** numa pasta onde ele vai ficar de vez.
2. Dê dois cliques em **Instalar TaskQuest**. Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo**.
3. Use o atalho **TaskQuest** na Área de Trabalho ou no Menu Iniciar.

O atalho abre o app numa janelinha própria do Microsoft Edge, fixa em 360×480, sem abas nem barra de endereço:

```
msedge.exe --app="file:///<pasta-do-taskquest>/index.html" --window-size=376,528
```

Funciona offline: a fonte Press Start 2P vem em `fonts/` (licença SIL OFL, em `fonts/OFL.txt`). Se a pasta mudar de lugar, rode o instalador de novo.

## Controle

| Tecla | Função |
|---|---|
| Setas | Mover |
| `Z` | Confirmar |
| `X` | Cancelar / voltar |

Nenhuma outra tecla faz nada, exceto quando se digita um nome (aí o teclado digita normal: `Enter` confirma, `Esc` volta).

## Tela de título

- **START:** vai para a lista de quests. Na primeira vez (e depois de um reset), abre antes o **NOVO PERSONAGEM**: escolha o nome, aperte CONFIRMAR e responda SIM em "SALVAR PERSONAGEM?". Todo personagem começa como trabalhador.
- **OPÇÕES** (aparece depois que o personagem existe):
  - **Som:** liga ou desliga.
  - **Nome:** nome do personagem (até 12 letras).
  - **Skin:** `← →` troca entre as skins já desbloqueadas. A cada 10 níveis libera uma: LV 10 cavaleiro, 20 mago, 30 ninja, 40 orc, 50 esqueleto, 60 robô, 70 cafeteira, 80 tubarão-martelo, 90 unknown, 100 gato.
  - **Reset:** pede confirmação, o personagem morre e solta a alminha. Tudo volta ao início, inclusive as quests.

## Como jogar

- A tela principal mostra as quests ativas. X volta para a tela de título.
- **Nova quest:** selecione `+ NOVA QUEST` e aperte Z.
  - **Nome:** digitado no teclado.
  - **Dificuldade:** `← →` para escolher.
  - **Prazo final:** começa em amanhã. Z entra na edição; `← →` escolhe dia/mês/ano, `↑ ↓` ajusta; Z sai. A quest vence às 18:00 desse dia (fim do horário comercial).
  - Desça até **ACEITAR QUEST** e aperte Z.
- **Numa quest:** Z abre o menu: Concluir, Editar, Abandonar, Voltar.

## Regras

- **EASY** (verde) +10 XP · **MEDIUM** (amarelo) +25 XP · **HARD** (vermelho) +50 XP
- Você tem 3 ♥. Quest que passa do prazo custa 1 ♥. Sem corações: o personagem morre e é **GAME OVER** (continuar restaura o HP, mas perde o XP do nível atual).
- Adiar o prazo de uma quest aberta também custa 1 ♥ (o jogo pede confirmação). Com 1 ♥ só, não dá para adiar.
- Todo nível custa 100 XP. Subir de nível devolve 1 ♥ (no máximo 3) e mostra uma frase motivacional. A cada 10 níveis, uma skin nova.
- O nível máximo é **LV. 100**, e ele guarda uma surpresa.
- O timer fica amarelo com menos de 24h e vermelho com menos de 1h.

## Tecnologia

HTML, CSS e JavaScript puros, sem dependências nem build. Basta abrir o `index.html`.
