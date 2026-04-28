// Monte Carlo Engine for Blackjack Trainer

class MonteCarloEngine {
    constructor() {
        this.SIMULATION_RUNS = 2000;
    }

    calculateScore(cards) {
        let score = 0;
        let aces = 0;
        
        for (let card of cards) {
            score += card.value;
            if (card.value === 11) {
                aces += 1;
            }
        }
        
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }
        return score;
    }

    isSoft17(cards) {
        let score = 0;
        let aces = 0;
        for (let card of cards) {
            score += card.value;
            if (card.value === 11) aces += 1;
        }
        if (aces === 0) return false;
        
        // Soft 17 is usually Ace + 6 (11 + 6 = 17)
        // Or could be Ace + 2 + 4, etc.
        let lowScore = score - (aces * 10); // Minimum possible score
        // If the max valid score (using one Ace as 11) is 17
        return (lowScore + 10 === 17);
    }

    playDealer(deck, dealerHand) {
        let currentHand = [...dealerHand];
        
        while (true) {
            let score = this.calculateScore(currentHand);
            if (score < 17) {
                currentHand.push(deck.draw());
            } else if (score === 17 && this.isSoft17(currentHand)) {
                // Dealer hits on soft 17
                currentHand.push(deck.draw());
            } else {
                break;
            }
        }
        return this.calculateScore(currentHand);
    }

    // Play a single hand with basic logic for "Hit until 17" for the player as a baseline
    playPlayer(deck, playerHand, initialAction) {
        let currentHand = [...playerHand];
        
        if (initialAction === 'STAND') {
            return this.calculateScore(currentHand);
        } else if (initialAction === 'DOUBLE') {
            currentHand.push(deck.draw());
            return this.calculateScore(currentHand);
        } else if (initialAction === 'HIT') {
            currentHand.push(deck.draw());
            let currentScore = this.calculateScore(currentHand);
            // After hitting once, we simulate basic strategy: stand on hard 17+ or soft 18+
            while (currentScore < 17) {
                currentHand.push(deck.draw());
                currentScore = this.calculateScore(currentHand);
            }
            return currentScore;
        }
        return this.calculateScore(currentHand);
    }

    simulateAction(baseDeck, dealerUpCard, playerHand, action) {
        let wins = 0;
        let pushes = 0;
        let loss = 0;

        for (let i = 0; i < this.SIMULATION_RUNS; i++) {
            // Clone the deck and shuffle it
            let simDeck = baseDeck.clone();
            simDeck.shuffle();

            let playerHandSim = [...playerHand];
            let dealerHandSim = [dealerUpCard];

            // Add dealer hidden card
            dealerHandSim.push(simDeck.draw());

            // Check immediate dealer blackjack
            let dealerScore = this.calculateScore(dealerHandSim);
            let pScore = this.calculateScore(playerHandSim);
            
            if (dealerScore === 21 && dealerHandSim.length === 2) {
                if (pScore === 21 && playerHandSim.length === 2) {
                    pushes++;
                } else {
                    loss += (action === 'DOUBLE' ? 2 : 1);
                }
                continue;
            }

            // Simulate Player
            pScore = this.playPlayer(simDeck, playerHandSim, action);
            
            if (pScore > 21) {
                loss += (action === 'DOUBLE' ? 2 : 1);
                continue;
            }

            // Simulate Dealer
            dealerScore = this.playDealer(simDeck, dealerHandSim);

            if (dealerScore > 21 || pScore > dealerScore) {
                wins += (action === 'DOUBLE' ? 2 : 1);
            } else if (pScore === dealerScore) {
                pushes++; // Or push counts as 0 change
            } else {
                loss += (action === 'DOUBLE' ? 2 : 1);
            }
        }

        // Expected Value
        let ev = ((wins - loss) / this.SIMULATION_RUNS) * 100;
        // Overall probability of winning ignoring pushes and magnitude
        let winProb = (wins / (wins + loss + pushes)) * 100;
        
        if (action === 'DOUBLE') {
            winProb = (wins/2 / ((wins/2) + (loss/2) + pushes)) * 100; // adjust win volume for display
        }

        return { winProb: Math.max(0, winProb), ev: ev };
    }

    getProbabilities(deck, dealerUpCard, playerHand, canDouble) {
        return new Promise((resolve) => {
            // In a real app this would be a Web Worker. We use setTimeout to not block UI immediately.
            setTimeout(() => {
                let pScore = this.calculateScore(playerHand);
                let hitResult = { winProb: 0, ev: -100 };
                let standResult = { winProb: 0, ev: -100 };
                let doubleResult = { winProb: 0, ev: -100 };

                if (pScore < 21) {
                    standResult = this.simulateAction(deck, dealerUpCard, playerHand, 'STAND');
                    hitResult = this.simulateAction(deck, dealerUpCard, playerHand, 'HIT');
                    if (canDouble) {
                        doubleResult = this.simulateAction(deck, dealerUpCard, playerHand, 'DOUBLE');
                    }
                }

                resolve({
                    hit: hitResult,
                    stand: standResult,
                    double: doubleResult
                });
            }, 50);
        });
    }
}
