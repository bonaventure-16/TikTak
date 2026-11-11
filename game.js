"use strict";

const SCORE_KEY = "three-in-a-row-scores";
const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];
const PREFERRED_MOVES = [4, 0, 2, 6, 8, 1, 3, 5, 7];

const boardElement = document.querySelector("#board");
const cells = Array.from(document.querySelectorAll(".cell"));
const statusElement = document.querySelector("#game-status");
const storageMessage = document.querySelector("#storage-message");
const scoreElements = {
    player: document.querySelector("#player-score"),
    computer: document.querySelector("#computer-score"),
    draws: document.querySelector("#draw-score")
};

let board = Array(9).fill("");
let scores = loadScores();
let roundFinished = false;
let computerThinking = false;
let computerTimer = null;

function loadScores() {
    try {
        const saved = localStorage.getItem(SCORE_KEY);
        if (saved === null) return { player: 0, computer: 0, draws: 0 };
        const parsed = JSON.parse(saved);
        if (
            !parsed ||
            !["player", "computer", "draws"].every(key =>
                Number.isSafeInteger(parsed[key]) && parsed[key] >= 0
            )
        ) {
            throw new TypeError("Saved scores are not valid.");
        }
        return parsed;
    } catch (error) {
        storageMessage.textContent = `Scores could not be loaded: ${error.message}`;
        return { player: 0, computer: 0, draws: 0 };
    }
}

function saveScores() {
    try {
        localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
        storageMessage.textContent = "";
    } catch (error) {
        storageMessage.textContent = `Scores could not be saved: ${error.message}`;
    }
    renderScores();
}

function renderScores() {
    for (const [key, element] of Object.entries(scoreElements)) {
        element.textContent = String(scores[key]);
    }
}

function getWinningLine(position) {
    return WINNING_LINES.find(line =>
        line.includes(position) &&
        board[line[0]] &&
        board[line[0]] === board[line[1]] &&
        board[line[1]] === board[line[2]]
    );
}

function renderBoard(winningLine = []) {
    cells.forEach((cell, index) => {
        cell.textContent = board[index];
        cell.dataset.mark = board[index];
        cell.disabled = Boolean(board[index]) || roundFinished || computerThinking;
        cell.classList.toggle("is-winner", winningLine.includes(index));
        const row = Math.floor(index / 3) + 1;
        const column = index % 3 + 1;
        cell.setAttribute(
            "aria-label",
            `Row ${row}, column ${column}: ${board[index] || "empty"}`
        );
    });
    boardElement.setAttribute("aria-busy", String(computerThinking));
}

function finishRound(winner, winningLine = []) {
    roundFinished = true;
    if (winner === "X") {
        scores.player += 1;
        statusElement.textContent = "You win! Nice three in a row.";
    } else if (winner === "O") {
        scores.computer += 1;
        statusElement.textContent = "The computer wins this round.";
    } else {
        scores.draws += 1;
        statusElement.textContent = "It’s a draw. Well played.";
    }
    saveScores();
    renderBoard(winningLine);
}

function checkRoundEnd(position) {
    const winningLine = getWinningLine(position);
    if (winningLine) {
        finishRound(board[position], winningLine);
        return true;
    }
    if (board.every(Boolean)) {
        finishRound(null);
        return true;
    }
    return false;
}

function takePlayerTurn(position) {
    if (roundFinished || computerThinking || board[position]) return;

    board[position] = "X";
    if (checkRoundEnd(position)) return;

    computerThinking = true;
    statusElement.textContent = "The computer is thinking…";
    renderBoard();
    computerTimer = window.setTimeout(takeComputerTurn, 320);
}

function scorePosition(currentPlayer, depth) {
    const winner = findWinner();
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (board.every(Boolean)) return 0;

    const moves = PREFERRED_MOVES.filter(index => !board[index]);
    if (currentPlayer === "O") {
        let bestScore = -Infinity;
        for (const move of moves) {
            board[move] = "O";
            bestScore = Math.max(bestScore, scorePosition("X", depth + 1));
            board[move] = "";
        }
        return bestScore;
    }

    let bestScore = Infinity;
    for (const move of moves) {
        board[move] = "X";
        bestScore = Math.min(bestScore, scorePosition("O", depth + 1));
        board[move] = "";
    }
    return bestScore;
}

function findWinner() {
    for (const line of WINNING_LINES) {
        if (board[line[0]] && board[line[0]] === board[line[1]] && board[line[1]] === board[line[2]]) {
            return board[line[0]];
        }
    }
    return null;
}

function chooseComputerMove() {
    let bestMove = -1;
    let bestScore = -Infinity;
    for (const move of PREFERRED_MOVES) {
        if (board[move]) continue;
        board[move] = "O";
        const score = scorePosition("X", 0);
        board[move] = "";
        if (score > bestScore) {
            bestMove = move;
            bestScore = score;
        }
    }
    return bestMove;
}

function takeComputerTurn() {
    const position = chooseComputerMove();
    if (position !== -1) board[position] = "O";
    computerThinking = false;
    if (position !== -1 && checkRoundEnd(position)) return;
    statusElement.textContent = "Your turn. Pick a square.";
    renderBoard();
}

function startNewRound() {
    if (computerTimer !== null) {
        window.clearTimeout(computerTimer);
        computerTimer = null;
    }
    board = Array(9).fill("");
    roundFinished = false;
    computerThinking = false;
    statusElement.textContent = "Pick a square to begin.";
    renderBoard();
}

cells.forEach(cell => {
    cell.addEventListener("click", () => takePlayerTurn(Number(cell.dataset.cell)));
});

document.querySelector("#new-round").addEventListener("click", startNewRound);
document.querySelector("#reset-scores").addEventListener("click", () => {
    scores = { player: 0, computer: 0, draws: 0 };
    saveScores();
    startNewRound();
});

renderScores();
renderBoard();
