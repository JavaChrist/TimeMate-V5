class ActivityStatistics {
    constructor() {
        this.activities = JSON.parse(localStorage.getItem('activities')) || [];
    }

    calculatePlannedHours(detail) {
        const startTime = new Date(`1970-01-01T${detail.startTime}`);
        const endTime = new Date(`1970-01-01T${detail.endTime}`);
        return (endTime - startTime) / (1000 * 3600);
    }

    getWeeklyStats(startDate = new Date()) {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const stats = {
            totalPlanned: 0,
            totalRealized: 0,
            byCategory: {},
            efficiency: 0
        };

        this.activities.forEach(activity => {
            if (!activity.activitiesDetails) return;

            activity.activitiesDetails.forEach(detail => {
                if (!detail.date) return;

                const detailDate = new Date(detail.date);
                if (detailDate >= startDate && detailDate < endDate) {
                    // Calculer les heures prévues
                    const plannedHours = this.calculatePlannedHours(detail);
                    stats.totalPlanned += plannedHours;

                    // Calculer les heures réalisées
                    const realizedHours = parseFloat(detail.realizedTime || 0);
                    stats.totalRealized += realizedHours;

                    // Statistiques par catégorie
                    const category = activity.category || 'Sans catégorie';
                    if (!stats.byCategory[category]) {
                        stats.byCategory[category] = {
                            planned: 0,
                            realized: 0
                        };
                    }
                    stats.byCategory[category].planned += plannedHours;
                    stats.byCategory[category].realized += realizedHours;
                }
            });
        });

        // Calculer l'efficacité
        stats.efficiency = stats.totalPlanned > 0
            ? (stats.totalRealized / stats.totalPlanned * 100).toFixed(2)
            : 0;

        return stats;
    }

    showStatistics() {
        const stats = this.getWeeklyStats();
        const modalHtml = `
            <div class="statistics-modal">
                <h3>Statistiques hebdomadaires</h3>
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-label">Heures prévues</span>
                        <span class="stat-value">${stats.totalPlanned.toFixed(2)}h</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Heures réalisées</span>
                        <span class="stat-value">${stats.totalRealized.toFixed(2)}h</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Efficacité</span>
                        <span class="stat-value">${stats.efficiency}%</span>
                    </div>
                </div>
                <div class="category-stats">
                    <h4>Par catégorie</h4>
                    ${this.generateCategoryStats(stats.byCategory)}
                </div>
            </div>
        `;

        // Créer et afficher la modale
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        // Ajouter le bouton de fermeture
        const closeButton = document.createElement('button');
        closeButton.className = 'close-modal';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => modal.remove();
        modal.querySelector('.statistics-modal').prepend(closeButton);
    }

    generateCategoryStats(categories) {
        return Object.entries(categories)
            .map(([category, data]) => `
                <div class="category-stat">
                    <h5>${category}</h5>
                    <div class="category-bar">
                        <div class="category-progress" style="width: ${(data.realized / data.planned * 100) || 0}%"></div>
                    </div>
                    <div class="category-details">
                        <span>Prévu: ${data.planned.toFixed(2)}h</span>
                        <span>Réalisé: ${data.realized.toFixed(2)}h</span>
                    </div>
                </div>
            `).join('');
    }
}
