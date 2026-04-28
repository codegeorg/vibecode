// Main Game Application

const ui = {
    bankrollDisplay: document.getElementById('bankroll-display'),
    currentBetDisplay: document.getElementById('current-bet-display'),
    dealerCards: document.getElementById('dealer-cards'),
    playerCards: document.getElementById('player-cards'),
    dealerScore: document.getElementById('dealer-score'),
    playerScore: document.getElementById('player-score'),
    
    btnChips: document.querySelectorAll('.btn-chip'),
    btnDeal: document.getElementById('btn-deal'),
    btnHit: document.getElementById('btn-hit'),
    btnStand: document.getElementById('btn-stand'),
    btnDouble: document.getElementById('btn-double'),
    btnSplit: document.getElementById('btn-split'),
    btnSurrender: document.getElementById('btn-surrender'),
    
    bettingControls: document.getElementById('betting-controls'),
    actionControls: document.getElementById('action-controls'),
    
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    btnNextHand: document.getElementById('btn-next-hand'),
    
    probPanel: document.getElementById('probability-panel'),
    probGrid: document.getElementById('prob-grid'),
    probLoading: document.getElementById('prob-loading')
};

class Game {
    constructor() {
        this.bankroll = 1000;
        this.currentBet = 10;
        this.deck = new Deck();
        this.mcEngine = new MonteCarloEngine();
        
        this.dealerHand = [];
        this.playerHand = [];
        this.dealerHiddenCard = null;
        
        this.state = 'BETTING'; // 'BETTING', 'PLAYING', 'DEALER_TURN', 'GAME_OVER'
        
        this.setupEventListeners();
        this.updateBankrollUI();
        this.deck.shuffle();
    }

    setupEventListeners() {
        ui.btnChips.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.state !== 'BETTING') return;
                const val = parseInt(e.target.dataset.val);
                if (this.currentBet + val <= this.bankroll) {
                    this.currentBet += val;
                    this.updateBankrollUI();
                }
            });
        });

        // Allow click on bet chip to reset bet
        document.querySelector('.bet-chip').addEventListener('click', () => {
            if (this.state === 'BETTING') {
                this.currentBet = 0;
                this.updateBankrollUI();
            }
        });

        ui.btnDeal.addEventListener('click', () => this.dealInitialCards());
        ui.btnHit.addEventListener('click', () => this.playerHit());
        ui.btnStand.addEventListener('click', () => this.playerStand());
        ui.btnDouble.addEventListener('click', () => this.playerDouble());
        ui.btnSurrender.addEventListener('click', () => this.playerSurrender());
        ui.btnNextHand.addEventListener('click', () => this.resetHand());
    }

    updateBankrollUI() {
        ui.bankrollDisplay.innerText = `€${this.bankroll.toFixed(2)}`;
        ui.currentBetDisplay.innerText = `€${this.currentBet}`;
        ui.btnDeal.disabled = this.currentBet === 0 || this.currentBet > this.bankroll;
    }

    calculateScore(cards) {
        let score = 0;
        let aces = 0;
        for (let card of cards) {
            score += card.value;
            if (card.value === 11) aces += 1;
        }
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }
        return score;
    }

    getScoreDisplay(cards) {
        let baseScore = 0;
        let aces = 0;
        for (let card of cards) {
            baseScore += card.value;
            if (card.value === 11) aces += 1;
        }
        let currentScore = baseScore;
        let currentAces = aces;
        while (currentScore > 21 && currentAces > 0) {
            currentScore -= 10;
            currentAces -= 1;
        }
        if (currentScore <= 21 && currentAces > 0) {
            return `${currentScore - 10} / ${currentScore}`;
        }
        return `${currentScore}`;
    }

    renderCards(container, hand, hiddenCardIndex = -1) {
        container.innerHTML = '';
        hand.forEach((card, index) => {
            container.appendChild(card.getDomElement(index === hiddenCardIndex));
        });
    }

    async dealInitialCards() {
        if (this.currentBet === 0 || this.currentBet > this.bankroll) return;
        
        this.bankroll -= this.currentBet;
        this.updateBankrollUI();
        this.state = 'PLAYING';
        
        ui.bettingControls.classList.add('hidden');
        ui.actionControls.classList.remove('hidden');
        
        // Ensure probabilities panel is visible
        ui.probPanel.classList.remove('hidden');

        // Draw 4 cards
        this.playerHand = [this.deck.draw(), this.deck.draw()];
        this.dealerHand = [this.deck.draw(), this.deck.draw()];
        
        this.updateUI();
        
        // Initial Blackjack checks
        let dealerScore = this.calculateScore(this.dealerHand);
        let playerScore = this.calculateScore(this.playerHand);
        
        if (playerScore === 21) {
            if (dealerScore === 21) {
                this.endHand('Push!', this.currentBet);
            } else {
                this.endHand('Blackjack!', this.currentBet * 2.5);
            }
            return;
        }

        this.updateProbabilities();
    }

    updateUI() {
        this.renderCards(ui.playerCards, this.playerHand);
        let pScore = this.calculateScore(this.playerHand);
        ui.playerScore.innerText = this.getScoreDisplay(this.playerHand);
        
        if (this.state === 'PLAYING') {
            // Hide dealer second card
            this.renderCards(ui.dealerCards, this.dealerHand, 1);
            ui.dealerScore.innerText = this.dealerHand[0].value === 11 ? "11" : this.dealerHand[0].value;
            
            // Toggle split / double buttons appropriately
            ui.btnDouble.disabled = this.playerHand.length > 2 || this.currentBet > this.bankroll;
            ui.btnSplit.disabled = this.playerHand.length > 2 || this.playerHand[0].rank !== this.playerHand[1].rank || this.currentBet > this.bankroll;
            ui.btnSurrender.disabled = this.playerHand.length > 2;

        } else {
            // Show all dealer cards
            this.renderCards(ui.dealerCards, this.dealerHand);
            ui.dealerScore.innerText = this.calculateScore(this.dealerHand);
        }
    }

    async updateProbabilities() {
        ui.probLoading.classList.add('active');
        
        let pScore = this.calculateScore(this.playerHand);
        if (pScore >= 21 || this.state !== 'PLAYING') {
            ui.probLoading.classList.remove('active');
            return;
        }

        let dealerUpCard = this.dealerHand[0];
        let canDouble = this.playerHand.length === 2 && this.bankroll >= this.currentBet;
        
        let probs = await this.mcEngine.getProbabilities(this.deck, dealerUpCard, this.playerHand, canDouble);

        // Update UI bars
        this.renderProbRow('Hit', probs.hit.winProb, probs.hit.ev);
        this.renderProbRow('Stand', probs.stand.winProb, probs.stand.ev);
        this.renderProbRow('Double', canDouble ? probs.double.winProb : 0, canDouble ? probs.double.ev : 0);

        ui.probLoading.classList.remove('active');
    }

    renderProbRow(actionName, winProb, ev) {
        // Find existing row or update
        let rows = ui.probGrid.querySelectorAll('.prob-row');
        let targetRow = Array.from(rows).find(r => r.querySelector('.action').innerText === actionName);
        
        if (targetRow) {
            targetRow.querySelector('.percentage').innerText = `${winProb.toFixed(1)}%`;
            let bar = targetRow.querySelector('.bar');
            bar.style.width = `${winProb}%`;
            
            // Color code bar based on best EV
            bar.className = 'bar';
            if (winProb > 50) {
                 bar.className = 'bar win-bar';
            } else {
                 bar.style.background = '#e57373'; // Reddish for poorer odds
            }
        }
    }

    playerHit() {
        this.playerHand.push(this.deck.draw());
        this.updateUI();
        
        let score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.endHand('Bust!', 0);
        } else {
            this.updateProbabilities();
        }
    }

    playerStand() {
        this.state = 'DEALER_TURN';
        this.updateUI();
        this.playDealerTurn();
    }

    playerDouble() {
        if (this.currentBet > this.bankroll) return;
        this.bankroll -= this.currentBet;
        this.currentBet *= 2;
        this.updateBankrollUI();
        
        this.playerHand.push(this.deck.draw());
        this.updateUI();
        
        if (this.calculateScore(this.playerHand) > 21) {
            this.endHand('Bust!', 0);
        } else {
            this.state = 'DEALER_TURN';
            this.playDealerTurn();
        }
    }

    playerSurrender() {
        this.endHand('Surrender', this.currentBet / 2);
    }

    async playDealerTurn() {
        ui.actionControls.classList.add('hidden');
        ui.probPanel.classList.add('hidden');
        
        let dealerScore = this.calculateScore(this.dealerHand);
        let playerScore = this.calculateScore(this.playerHand);
        
        // Delay for dramatic effect
        await new Promise(r => setTimeout(r, 800));
        this.updateUI(); // reveals hidden card

        while (dealerScore < 17 || (dealerScore === 17 && this.mcEngine.isSoft17(this.dealerHand))) {
            await new Promise(r => setTimeout(r, 800));
            this.dealerHand.push(this.deck.draw());
            dealerScore = this.calculateScore(this.dealerHand);
            this.updateUI();
        }

        if (dealerScore > 21) {
            this.endHand('Dealer Busts! You Win!', this.currentBet * 2);
        } else if (dealerScore > playerScore) {
            this.endHand('Dealer Wins!', 0);
        } else if (dealerScore < playerScore) {
            this.endHand('You Win!', this.currentBet * 2);
        } else {
            this.endHand('Push!', this.currentBet);
        }
    }

    endHand(message, payout) {
        this.state = 'GAME_OVER';
        this.bankroll += payout;
        this.updateBankrollUI();
        
        ui.messageText.innerText = message;
        ui.messageOverlay.classList.remove('hidden');
        ui.actionControls.classList.add('hidden');
    }

    resetHand() {
        ui.messageOverlay.classList.add('hidden');
        ui.bettingControls.classList.remove('hidden');
        
        this.playerHand = [];
        this.dealerHand = [];
        this.state = 'BETTING';
        
        // Reset bet value logic
        if (this.currentBet > this.bankroll) {
            this.currentBet = 0;
        }
        
        if (this.deck.cards.length < 15) { // reshuffle point
            this.deck = new Deck();
            this.deck.shuffle();
        }
        
        this.updateUI();
        this.updateBankrollUI();
        
        // Clear desk visually
        ui.playerCards.innerHTML = '';
        ui.dealerCards.innerHTML = '';
        ui.playerScore.innerText = '0';
        ui.dealerScore.innerText = '?';
        ui.probPanel.classList.add('hidden');
    }
}

// Initialize Game
const blackjackGame = new Game();
