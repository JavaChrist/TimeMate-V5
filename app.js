const ThemeManager = {
    updateIcon: function (icon, theme) {
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            console.log('Icon updated:', icon.className);
        }
    },

    init: function () {
        const themeToggle = document.querySelector('#theme-toggle');
        console.log('Theme toggle button:', themeToggle);

        if (themeToggle) {
            const icon = themeToggle.querySelector('i');

            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.updateIcon(icon, savedTheme);

            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';

                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                this.updateIcon(icon, newTheme);
                console.log('Theme changed to:', newTheme);
            });
        }
    }
};

const StatsManager = {
    init: function () {
        const statsButton = document.querySelector('#stats-button');
        console.log('Statistics button:', statsButton);

        if (statsButton) {
            statsButton.addEventListener('click', () => {
                console.log('Statistics button clicked');
                try {
                    if (typeof ActivityStatistics === 'undefined') {
                        throw new Error('ActivityStatistics n\'est pas défini');
                    }
                    const stats = new ActivityStatistics();
                    stats.showStatistics();
                } catch (error) {
                    console.error('Erreur lors de l\'affichage des statistiques:', error);
                    alert('Impossible d\'afficher les statistiques. Veuillez vérifier la console pour plus de détails.');
                }
            });
        }
    }
};

const NotificationsManager = {
    init: function () {
        const modal = document.getElementById('notifications-settings');
        const notifButton = document.getElementById('notifications-button');
        const closeBtn = modal.querySelector('.close');
        const form = document.getElementById('notifications-form');

        // Mettre à jour l'état du bouton au chargement
        if (notifButton) {
            const enabled = localStorage.getItem('notifications-enabled') === 'true';
            notifButton.classList.toggle('active', enabled);
        }

        if (notifButton) {
            notifButton.onclick = async function () {
                if (!modal) return;
                modal.style.display = "block";

                // Charger les préférences
                const enabled = localStorage.getItem('notifications-enabled') === 'true';
                const timing = localStorage.getItem('notifications-timing') || '15';

                const enableCheckbox = document.getElementById('enable-notifications');
                const timingSelect = document.getElementById('notification-timing');

                if (enableCheckbox) enableCheckbox.checked = enabled;
                if (timingSelect) timingSelect.value = timing;
            };
        }

        if (closeBtn) {
            closeBtn.onclick = function () {
                modal.style.display = "none";
            };
        }

        if (form) {
            form.onsubmit = async function (e) {
                e.preventDefault();
                const enableCheckbox = document.getElementById('enable-notifications');
                const timingSelect = document.getElementById('notification-timing');

                if (!enableCheckbox || !timingSelect) return;

                const enabled = enableCheckbox.checked;
                const timing = timingSelect.value;

                localStorage.setItem('notifications-enabled', enabled);
                localStorage.setItem('notifications-timing', timing);

                if (enabled) {
                    const permitted = await NotificationService.requestPermission();
                    if (!permitted) {
                        alert('Les notifications ont été refusées par le navigateur');
                        enableCheckbox.checked = false;
                        localStorage.setItem('notifications-enabled', 'false');
                        notifButton.classList.remove('active');
                    } else {
                        notifButton.classList.add('active');
                        NotificationService.init(); // Réinitialiser les notifications
                    }
                } else {
                    notifButton.classList.remove('active');
                }

                modal.style.display = "none";
            };
        }

        // Fermer la modale si on clique en dehors
        window.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };
    }
};

const NotificationService = {
    checkPermission: function () {
        if (!("Notification" in window)) {
            alert("Ce navigateur ne supporte pas les notifications");
            return false;
        }
        return true;
    },

    requestPermission: async function () {
        if (this.checkPermission()) {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return false;
    },

    scheduleNotification: function (activity, detail) {
        if (localStorage.getItem('notifications-enabled') !== 'true') return;

        const timing = parseInt(localStorage.getItem('notifications-timing')) || 15;
        const activityDate = new Date(detail.date + 'T' + detail.startTime);
        const notificationDate = new Date(activityDate.getTime() - (timing * 60 * 1000));

        const now = new Date();
        const timeUntilNotification = notificationDate.getTime() - now.getTime();

        if (timeUntilNotification > 0) {
            console.log(`Notification programmée pour ${activity.activityName} dans ${timeUntilNotification / 1000} secondes`);
            setTimeout(() => {
                this.showNotification(activity.activityName, detail);
            }, timeUntilNotification);
        }
    },

    showNotification: function (activityName, detail) {
        if (Notification.permission === "granted") {
            console.log('Affichage de la notification pour', activityName);
            const notification = new Notification("Rappel d'activité", {
                body: `${activityName} commence dans ${localStorage.getItem('notifications-timing')} minutes\nHeure de début : ${detail.startTime}`,
                icon: "/path/to/your/icon.png",
                requireInteraction: true
            });

            notification.onclick = function (event) {
                event.preventDefault();
                window.focus();
                notification.close();
            };
        }
    },

    init: function () {
        console.log('Initialisation des notifications');
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        activities.forEach(activity => {
            activity.activitiesDetails.forEach(detail => {
                this.scheduleNotification(activity, detail);
            });
        });
    }
};

// Modifier votre premier DOMContentLoaded existant pour ajouter ces initialisations
document.addEventListener('DOMContentLoaded', function () {
    // Initialiser les managers
    ThemeManager.init();
    StatsManager.init();
    NotificationsManager.init();
    NotificationService.init();

    // Initialiser la modale
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = "none";
    }

    // Forcer la fermeture de toutes les modales au chargement
    const modals = document.querySelectorAll('.modal, #modal, #activity-modal');
    modals.forEach(modal => {
        if (modal) {
            modal.style.display = 'none';
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    let isIntentionalLogout = false;


    // Vérification de l'authentification
    firebase.auth().onAuthStateChanged((user) => {
        if (!user && !isIntentionalLogout) {
            window.location.href = './index.html';
            return;
        }
    });

    // Gestion du bouton de déconnexion
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            isIntentionalLogout = true;
            firebase.auth().signOut().then(() => {
                window.location.href = './index.html';
            }).catch((error) => {
                console.error('Erreur lors de la déconnexion:', error);
                isIntentionalLogout = false;
            });
        });
    }

    // Gestion du bouton "Retour au tableau"
    const backButton = document.querySelector('button[onclick="location.href=\'activites.html\'"]');
    if (backButton) {
        backButton.onclick = function (e) {
            e.preventDefault();
            isIntentionalNavigation = true;
            window.location.href = 'activites.html';
        };
    }

    // Gestion de la navigation intentionnelle
    document.querySelectorAll('a, button').forEach(element => {
        if (element.getAttribute('href') || element.getAttribute('onclick')) {
            element.addEventListener('click', () => {
                isIntentionalNavigation = true;
            });
        }
    });

    // Surveiller les modifications du formulaire
    const activityForm = document.getElementById('activity-form');
    if (activityForm) {
        activityForm.addEventListener('change', () => {
            hasUnsavedChanges = true;
        });
    }

    // Réinitialiser hasUnsavedChanges après la sauvegarde
    const saveButton = document.getElementById('save-event');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            hasUnsavedChanges = false;
        });
    }

    window.addEventListener('beforeunload', (event) => {
        if (hasUnsavedChanges && !isIntentionalNavigation) {
            event.preventDefault();
            event.returnValue = '';
            return event.returnValue;
        }
    });

    let currentViewDate = new Date();
    const openModalButton = document.getElementById('openModal');

    if (openModalButton) {
        const modal = document.getElementById('modal');
        const closeModalSpan = document.querySelector('.close');
        const saveEventButton = document.getElementById('save-event');

        // Ouvrir la modale pour créer ou modifier une activité
        openModalButton.addEventListener('click', function () {
            modal.style.display = 'block';
            resetModalFields(); // Réinitialise les champs pour éviter les conflits
        });

        // Fermer la modale de création/modification d'activité
        closeModalSpan.addEventListener('click', function () {
            modal.style.display = 'none';
            resetModalFields();
        });

        // Fermer la modale si l'utilisateur clique en dehors
        window.addEventListener('click', function (event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                resetModalFields();
            }
        });

        // Réinitialiser les champs de la modale
        function resetModalFields() {
            const fields = {
                'activity-name': '',
                'activity-time-start-1': '',
                'activity-time-end-1': '',
                'activity-time-start-2': '',
                'activity-time-end-2': '',
                'activity-start-date': '',
                'activity-end-date': '',
                'activity-color': '#ff0000',
                'activity-realized-time': ''
            };

            // Vérifier l'existence de chaque élément avant de modifier sa valeur
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                    // Réactiver les champs si nécessaire
                    element.disabled = false;
                }
            });

            // Réinitialiser complètement le datepicker
            const activityDates = document.getElementById('activity-dates');
            if (activityDates && activityDates._flatpickr) {
                activityDates._flatpickr.clear();
                activityDates.value = ''; // S'assurer que le champ est vide
                activityDates._flatpickr.setDate([]); // Réinitialiser les dates sélectionnées
            }

            // Supprimer les attributs data du bouton de sauvegarde
            const saveButton = document.getElementById('save-event');
            if (saveButton) {
                saveButton.removeAttribute('data-activity-id');
                saveButton.removeAttribute('data-activity-date');
            }
        }

        // Ouvrir une activité existante pour modification
        function openActivityForEdit(activityId, date) {
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const activity = activities.find(a => a.id === activityId);
            const detail = activity?.activitiesDetails.find(d => d.date === date);

            if (activity && detail) {
                const modal = document.getElementById('modal');
                if (!modal) return;

                // Vérifier et définir les valeurs seulement si les éléments existent
                const elements = {
                    'activity-name': activity.activityName,
                    'activity-time-start-1': detail.startTime,
                    'activity-time-end-1': detail.endTime,
                    'activity-color': detail.color,
                    'activity-realized-time': ''
                };

                // Mettre à jour les champs s'ils existent
                Object.entries(elements).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.value = value;
                        if (id === 'activity-name') {
                            element.disabled = true;
                        }
                    }
                });

                // Gérer les dates avec Flatpickr
                const datePicker = document.getElementById('activity-dates')._flatpickr;
                if (datePicker) {
                    // Convertir la date ISO en objet Date
                    const [year, month, day] = date.split('-').map(Number);
                    const selectedDate = new Date(year, month - 1, day, 12, 0, 0);

                    // Effacer les dates existantes et définir la nouvelle date
                    datePicker.clear();
                    datePicker.setDate(selectedDate);
                }

                // Désactiver les champs qui ne doivent pas être modifiés
                const fieldsToDisable = [
                    'activity-name',
                    'activity-color',
                    'activity-time-start-2',
                    'activity-time-end-2'
                ];

                fieldsToDisable.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.disabled = true;
                    }
                });

                // Définir les attributs data pour le bouton de sauvegarde
                const saveButton = document.getElementById('save-event');
                if (saveButton) {
                    saveButton.setAttribute('data-activity-id', activityId);
                    saveButton.setAttribute('data-activity-date', date);
                }

                // Afficher la modale
                modal.style.display = 'block';
            }
        }

        // Ajouter un bouton de suppression pour les activités dans le calendrier
        function addDeleteButton(activityElement, activityId, activityDate) {
            const deleteButton = document.createElement('span');
            deleteButton.textContent = '✖';
            deleteButton.classList.add('delete-activity-btn');
            deleteButton.style.color = 'white';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.marginLeft = '100px';

            deleteButton.addEventListener('click', function (event) {
                event.stopPropagation(); // Empêche d'ouvrir la modale lors du clic sur supprimer
                if (confirm('Voulez-vous vraiment supprimer cette activité ?')) {
                    removeActivityFromDay(activityId, activityDate);
                    loadActivitiesFromStorage(currentViewDate);
                }
            });

            activityElement.appendChild(deleteButton);
        }

        // Supprimer une activité d'une journée spécifique
        function removeActivityFromDay(activityId, activityDate) {
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const updatedActivities = activities.map(activity => {
                if (activity.id === activityId) {
                    // Trouver le détail de l'activité à supprimer
                    const detailIndex = activity.activitiesDetails.findIndex(detail => detail.date === activityDate);

                    if (detailIndex !== -1) {
                        const detailToRemove = activity.activitiesDetails[detailIndex];

                        // Calculer les heures prévues pour cette entrée
                        const startTime = new Date(`1970-01-01T${detailToRemove.startTime}`);
                        const endTime = new Date(`1970-01-01T${detailToRemove.endTime}`);
                        const plannedHoursForDay = (endTime - startTime) / (1000 * 3600);

                        // Mettre à jour les heures totales prévues
                        activity.totalHours = (parseFloat(activity.totalHours) - plannedHoursForDay).toFixed(2);

                        // Mettre à jour les heures réalisées si elles existent
                        if (detailToRemove.realizedTime) {
                            activity.realizedHours = (parseFloat(activity.realizedHours || 0) - detailToRemove.realizedTime).toFixed(2);
                        }

                        // Supprimer uniquement l'activité spécifique
                        activity.activitiesDetails.splice(detailIndex, 1);
                    }

                    // Si plus aucun détail n'existe, supprimer l'activité complètement
                    if (activity.activitiesDetails.length === 0) {
                        return null;
                    }
                }
                return activity;
            }).filter(activity => activity !== null); // Supprimer les activités nulles

            localStorage.setItem('activities', JSON.stringify(updatedActivities));
            updateActivitiesTable(); // Mettre à jour le tableau des activités
        }

        // Sauvegarder une nouvelle activité ou une modification
        saveEventButton.addEventListener('click', function () {
            const activityId = saveEventButton.getAttribute('data-activity-id');
            const activityName = document.getElementById('activity-name').value;
            const startTimes = [
                document.getElementById('activity-time-start-1').value,
                document.getElementById('activity-time-start-2').value
            ];
            const endTimes = [
                document.getElementById('activity-time-end-1').value,
                document.getElementById('activity-time-end-2').value
            ];
            const startDateValue = document.getElementById('activity-start-date')?.value;
            const endDateValue = document.getElementById('activity-end-date')?.value;
            const color = document.getElementById('activity-color').value;
            const realizedTime = parseFloat(document.getElementById('activity-realized-time').value) || 0;

            // Si c'est une modification d'activité existante
            if (activityId) {
                const date = saveEventButton.getAttribute('data-activity-date');
                if (date && startTimes[0] && endTimes[0]) {
                    updateActivityDetail(activityId, date, startTimes[0], endTimes[0], realizedTime, color);
                    modal.style.display = 'none';
                    resetModalFields();
                    return;
                }
            }

            // Si c'est une nouvelle activité
            if (!activityName || !startDateValue || !startTimes.some((time, index) => time && endTimes[index])) {
                alert('Veuillez remplir au moins le nom et une plage horaire complète.');
                return;
            }

            const startDate = new Date(startDateValue);
            saveNewActivity(activityName, startDate, endDateValue, startTimes, endTimes, color, realizedTime);

            loadActivitiesFromStorage(currentViewDate);
            updateActivitiesTable();
            updateActivityNamesList();
            modal.style.display = 'none';
            resetModalFields();
        });

        // Mettre à jour les détails d'une activité existante
        function updateActivityDetail(activityId, date, startTime, endTime, realizedTime, color) {
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const activityIndex = activities.findIndex(a => a.id === activityId);

            if (activityIndex !== -1) {
                const activity = activities[activityIndex];
                const detailIndex = activity.activitiesDetails.findIndex(d => d.date === date);

                if (detailIndex !== -1) {
                    const oldDetail = activity.activitiesDetails[detailIndex];
                    let remainingTimeToDeduct = parseFloat(realizedTime || 0);

                    // Calculer les heures prévues pour ce détail spécifique
                    const plannedHours = calculateHoursBetween(startTime, endTime);
                    const currentRealizedTime = parseFloat(oldDetail.realizedTime || 0);
                    const availableHours = plannedHours - currentRealizedTime;

                    // Si le temps à déduire est supérieur aux heures disponibles dans cette plage
                    if (remainingTimeToDeduct > availableHours) {
                        // Supprimer cette plage horaire car elle est complétée
                        activity.activitiesDetails.splice(detailIndex, 1);

                        // Calculer le temps restant à déduire
                        remainingTimeToDeduct -= availableHours;

                        // Chercher d'autres plages horaires du même jour pour déduire le reste
                        const sameDayDetails = activity.activitiesDetails.filter(d => d.date === date);
                        for (let i = 0; i < sameDayDetails.length && remainingTimeToDeduct > 0; i++) {
                            const detail = sameDayDetails[i];
                            const detailPlannedHours = calculateHoursBetween(detail.startTime, detail.endTime);
                            const detailRealizedTime = parseFloat(detail.realizedTime || 0);
                            const detailAvailableHours = detailPlannedHours - detailRealizedTime;

                            if (detailAvailableHours > 0) {
                                const timeToDeduct = Math.min(remainingTimeToDeduct, detailAvailableHours);
                                detail.realizedTime = (detailRealizedTime + timeToDeduct).toFixed(2);
                                remainingTimeToDeduct -= timeToDeduct;

                                // Si cette plage est complétée, la marquer pour suppression
                                if (parseFloat(detail.realizedTime) >= detailPlannedHours) {
                                    const idx = activity.activitiesDetails.findIndex(d =>
                                        d.date === detail.date &&
                                        d.startTime === detail.startTime &&
                                        d.endTime === detail.endTime
                                    );
                                    if (idx !== -1) {
                                        activity.activitiesDetails.splice(idx, 1);
                                    }
                                }
                            }
                        }
                    } else {
                        // Mettre à jour les heures réalisées pour ce détail
                        oldDetail.realizedTime = (currentRealizedTime + remainingTimeToDeduct).toFixed(2);
                        if (parseFloat(oldDetail.realizedTime) >= plannedHours) {
                            activity.activitiesDetails.splice(detailIndex, 1);
                        } else {
                            activity.activitiesDetails[detailIndex] = oldDetail;
                        }
                    }

                    // Mettre à jour les heures réalisées totales de l'activité
                    activity.realizedHours = (parseFloat(activity.realizedHours || 0) + parseFloat(realizedTime)).toFixed(2);

                    // Sauvegarder les modifications
                    activities[activityIndex] = activity;
                    localStorage.setItem('activities', JSON.stringify(activities));

                    // Fermer la modale
                    const modal = document.getElementById('modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }

                    // Réinitialiser le champ des heures réalisées
                    document.getElementById('activity-realized-time').value = '';

                    // Mettre à jour l'affichage
                    loadActivitiesFromStorage(currentViewDate);
                    updateActivitiesTable();
                }
            }
        }

        // Sauvegarder une nouvelle activité
        function saveNewActivity(activityName, startDate, endDateValue, startTimes, endTimes, color, realizedTime) {
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const endDate = new Date(endDateValue);

            // Régler les heures à midi pour éviter les problèmes de fuseau horaire
            startDate.setHours(12, 0, 0, 0);
            endDate.setHours(12, 0, 0, 0);

            const dayDifference = Math.round((endDate - startDate) / (1000 * 3600 * 24));

            // Calculer les heures prévues totales pour toutes les plages
            let totalPlannedHours = 0;
            startTimes.forEach((startTime, index) => {
                if (startTime && endTimes[index]) {
                    totalPlannedHours += calculateHoursBetween(startTime, endTimes[index]);
                }
            });
            totalPlannedHours = totalPlannedHours * (dayDifference + 1);

            // Chercher si une activité avec le même nom existe déjà
            const existingActivityIndex = activities.findIndex(a => a.activityName === activityName);

            if (existingActivityIndex !== -1) {
                // Si l'activité existe, ajouter les nouveaux détails
                const existingActivity = activities[existingActivityIndex];

                // Ajouter les nouveaux détails d'activité
                for (let i = 0; i <= dayDifference; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(currentDate.getDate() + i);
                    const dateStr = currentDate.toISOString().split('T')[0];

                    // Créer un tableau de plages horaires pour cette date
                    const timeSlots = [];
                    startTimes.forEach((startTime, index) => {
                        if (startTime && endTimes[index]) {
                            timeSlots.push({
                                startTime: startTime,
                                endTime: endTimes[index],
                                color: color,
                                realizedTime: 0
                            });
                        }
                    });

                    // Ajouter chaque plage horaire comme un détail séparé
                    timeSlots.forEach(slot => {
                        existingActivity.activitiesDetails.push({
                            date: dateStr,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            color: color,
                            realizedTime: 0
                        });
                    });
                }

                existingActivity.totalHours = (parseFloat(existingActivity.totalHours) + totalPlannedHours).toFixed(2);
                activities[existingActivityIndex] = existingActivity;

            } else {
                // Si l'activité n'existe pas, créer une nouvelle entrée
                let activitiesDetails = [];

                for (let i = 0; i <= dayDifference; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(currentDate.getDate() + i);
                    const dateStr = currentDate.toISOString().split('T')[0];

                    // Ajouter chaque plage horaire valide
                    startTimes.forEach((startTime, index) => {
                        if (startTime && endTimes[index]) {
                            activitiesDetails.push({
                                date: dateStr,
                                startTime: startTime,
                                endTime: endTimes[index],
                                color: color,
                                realizedTime: 0
                            });
                        }
                    });
                }

                const newActivity = {
                    id: generateUniqueId(),
                    activityName,
                    totalHours: totalPlannedHours.toFixed(2),
                    realizedHours: 0,
                    activitiesDetails
                };

                activities.push(newActivity);
            }

            localStorage.setItem('activities', JSON.stringify(activities));
        }

        function calculateHoursBetween(startTime, endTime) {
            // Créer des dates pour aujourd'hui avec les heures spécifiées
            const start = new Date(`1970-01-01T${startTime}`);
            let end = new Date(`1970-01-01T${endTime}`);

            // Si l'heure de fin est plus petite que l'heure de début, 
            // cela signifie qu'on passe minuit, donc on ajoute 24h
            if (end < start) {
                end = new Date(`1970-01-02T${endTime}`);
            }

            // Calculer la différence en heures
            const diffHours = (end - start) / (1000 * 3600);
            return diffHours;
        }

        // Charger et afficher les activités depuis le stockage local
        function loadActivitiesFromStorage(currentDate = new Date()) {
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const dayMapping = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);

            // Met à jour uniquement calendar-header
            const calendarHeader = document.querySelector('.calendar-header');
            calendarHeader.innerHTML = '';

            dayMapping.forEach((day, index) => {
                const dayDate = new Date(startOfWeek);
                dayDate.setDate(startOfWeek.getDate() + index);
                const formattedDate = dayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

                const dayElement = document.createElement('div');
                dayElement.classList.add('calendar-day', day);
                dayElement.innerHTML = `<span class="day-title">${dayNames[index]}</span> - <span class="date-display">${formattedDate}</span>`;

                calendarHeader.appendChild(dayElement);
            });

            // Efface les doublons dans calendar-body
            dayMapping.forEach(day => {
                const dayContainer = document.getElementById(day);
                if (dayContainer) {
                    dayContainer.innerHTML = ''; // Nettoie les activités uniquement
                }
            });

            activities.forEach(activity => {
                activity.activitiesDetails.forEach(detail => {
                    const activityDate = new Date(detail.date);
                    const dayOfWeek = activityDate.getDay();
                    const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const dayContainer = document.getElementById(dayMapping[adjustedDayOfWeek]);

                    if (isDateInCurrentView(activityDate, currentDate)) {
                        const activityElement = document.createElement('div');
                        activityElement.classList.add('activity');
                        activityElement.style.backgroundColor = detail.color;
                        activityElement.setAttribute('data-activity-id', activity.id);
                        activityElement.setAttribute('data-activity-date', detail.date);

                        // Calculer les heures prévues et restantes en utilisant calculateHoursBetween
                        const plannedHours = calculateHoursBetween(detail.startTime, detail.endTime);
                        const remainingHours = (plannedHours - (detail.realizedTime || 0)).toFixed(2);

                        activityElement.innerHTML = `
                            <span class="activity-name">${activity.activityName}</span>
                            <span class="activity-time">${detail.startTime} - ${detail.endTime}</span>
                            <span class="activity-hours">(${remainingHours}h restantes)</span>
                        `;

                        // Ajouter l'événement de clic pour ouvrir la modale
                        activityElement.addEventListener('click', function () {
                            openActivityForEdit(activity.id, detail.date);
                        });

                        // Ajouter le bouton de suppression
                        addDeleteButton(activityElement, activity.id, detail.date);

                        dayContainer.appendChild(activityElement);
                    }
                });
            });
        }

        // Mettre à jour le tableau des activités
        function updateActivitiesTable() {
            const activitiesLog = document.getElementById('activities-log');
            if (!activitiesLog) return;

            const tableBody = activitiesLog.querySelector('tbody');
            if (!tableBody) return;

            // Récupérer les activités actuelles et l'historique
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const historique = JSON.parse(localStorage.getItem('historique')) || [];

            // Créer un objet pour stocker les totaux par nom d'activité
            const activityTotals = {};

            // Calculer les totaux pour les activités en cours
            activities.forEach(activity => {
                const name = activity.activityName;
                if (!activityTotals[name]) {
                    activityTotals[name] = {
                        plannedHours: 0,
                        realizedHours: 0
                    };
                }

                // Ajouter les heures prévues pour chaque détail
                activity.activitiesDetails.forEach(detail => {
                    const startTime = new Date(`1970-01-01T${detail.startTime}`);
                    const endTime = new Date(`1970-01-01T${detail.endTime}`);
                    const plannedHours = (endTime - startTime) / (1000 * 3600);

                    activityTotals[name].plannedHours += plannedHours;
                    activityTotals[name].realizedHours += parseFloat(detail.realizedTime || 0);
                });
            });

            // Ajouter ou mettre à jour avec les données de l'historique
            historique.forEach(historyItem => {
                const name = historyItem.activityName;
                if (!activityTotals[name]) {
                    activityTotals[name] = {
                        plannedHours: parseFloat(historyItem.totalHours || 0),
                        realizedHours: parseFloat(historyItem.realizedHours || 0)
                    };
                } else {
                    // Conserver les heures prévues existantes et ajouter les heures réalisées
                    activityTotals[name].realizedHours += parseFloat(historyItem.realizedHours || 0);
                }
            });

            // Vider le tableau
            tableBody.innerHTML = '';

            // Remplir le tableau avec les totaux
            Object.entries(activityTotals).forEach(([name, totals]) => {
                const row = tableBody.insertRow();

                // Case à cocher
                const checkboxCell = row.insertCell(0);
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('select-activity');
                checkbox.setAttribute('data-activity-name', name);
                checkboxCell.appendChild(checkbox);

                // Nom de l'activité
                const nameCell = row.insertCell(1);
                nameCell.textContent = name;

                // Heures prévues (toujours conservées)
                const plannedHoursCell = row.insertCell(2);
                plannedHoursCell.textContent = totals.plannedHours.toFixed(2);

                // Heures réalisées (cumul des heures saisies)
                const realizedHoursCell = row.insertCell(3);
                realizedHoursCell.textContent = totals.realizedHours.toFixed(2);

                // Heures restantes (différence entre prévues et réalisées)
                const remainingHoursCell = row.insertCell(4);
                const remainingHours = Math.max(0, totals.plannedHours - totals.realizedHours);
                remainingHoursCell.textContent = remainingHours.toFixed(2);
            });
        }

        // Générer un identifiant unique pour chaque activité
        function generateUniqueId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        // Déterminer si une date est dans la semaine affichée
        function isDateInCurrentView(activityDate, currentDate) {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            // Créer une nouvelle date avec l'heure à midi
            const compareDate = new Date(activityDate);
            compareDate.setHours(12, 0, 0, 0);

            return compareDate >= startOfWeek && compareDate <= endOfWeek;
        }

        const nextWeekButton = document.getElementById('next-week');
        const previousWeekButton = document.getElementById('previous-week');

        nextWeekButton.addEventListener('click', function () {
            adjustWeek(7);
        });

        previousWeekButton.addEventListener('click', function () {
            adjustWeek(-7);
        });

        function adjustWeek(days) {
            currentViewDate.setDate(currentViewDate.getDate() + days);
            displayWeekNumber(currentViewDate);
            loadActivitiesFromStorage(currentViewDate);
        }

        function displayWeekNumber(date) {
            const weekNumber = moment(date).isoWeek();
            const weekNumberContainer = document.getElementById('week-number');
            weekNumberContainer.textContent = `Semaine ${weekNumber}`;
        }

        displayWeekNumber(currentViewDate);
        loadActivitiesFromStorage(currentViewDate);
        updateActivitiesTable();
        updateActivityNamesList();

        function updateActivityNamesList() {
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            const historique = JSON.parse(localStorage.getItem('historique')) || [];

            // Combiner les noms des activités actuelles et de l'historique
            const allNames = new Set([
                ...activities.map(activity => activity.activityName),
                ...historique.map(item => item.activityName)
            ]);

            const activityNameInput = document.getElementById('activity-name');
            if (!activityNameInput) return;

            const namesContainer = document.createElement('div');
            namesContainer.id = 'names-container';
            namesContainer.classList.add('names-container');

            allNames.forEach(name => {
                const nameItem = document.createElement('div');
                nameItem.classList.add('name-item');

                const nameText = document.createElement('span');
                nameText.textContent = name;
                nameText.classList.add('name-text');

                // Ajouter le bouton X
                const deleteButton = document.createElement('span');
                deleteButton.textContent = '✖';
                deleteButton.classList.add('delete-name-button');

                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Voulez-vous vraiment supprimer ce nom de la liste ?')) {
                        const historique = JSON.parse(localStorage.getItem('historique')) || [];
                        const updatedHistorique = historique.filter(item => item.activityName !== name);
                        localStorage.setItem('historique', JSON.stringify(updatedHistorique));

                        nameItem.remove();
                        if (namesContainer.children.length === 0) {
                            namesContainer.style.display = 'none';
                        }
                    }
                });

                nameItem.appendChild(nameText);
                nameItem.appendChild(deleteButton);

                // Sélectionner le nom (uniquement sur clic du texte)
                nameText.addEventListener('click', () => {
                    activityNameInput.value = name;
                    namesContainer.style.display = 'none';
                });

                namesContainer.appendChild(nameItem);
            });

            const oldContainer = document.getElementById('names-container');
            if (oldContainer) {
                oldContainer.remove();
            }

            const inputContainer = activityNameInput.parentElement;
            inputContainer.classList.add('input-container');
            inputContainer.appendChild(namesContainer);

            activityNameInput.addEventListener('focus', () => {
                if (namesContainer.children.length > 0) {
                    namesContainer.style.display = 'block';
                }
            });

            document.addEventListener('click', (e) => {
                if (!namesContainer.contains(e.target) && e.target !== activityNameInput) {
                    namesContainer.style.display = 'none';
                }
            });

            activityNameInput.addEventListener('input', () => {
                const searchText = activityNameInput.value.toLowerCase();
                Array.from(namesContainer.children).forEach(item => {
                    const nameText = item.firstChild.textContent.toLowerCase();
                    item.style.display = nameText.includes(searchText) ? 'flex' : 'none';
                });
                namesContainer.style.display = 'block';
            });
        }

        // Initialiser Flatpickr
        const datePicker = flatpickr("#activity-dates", {
            mode: "multiple",
            dateFormat: "d/m",
            locale: "fr",
            weekNumbers: true,
            shorthandCurrentMonth: true,
            showMonths: 1,
            altInput: true,
            altFormat: "d/m",
            onChange: function (selectedDates) {
                if (selectedDates.length > 0) {
                    selectedDates.sort((a, b) => a - b);

                    // Ajuster les dates pour éviter le décalage de fuseau horaire
                    const startDate = new Date(selectedDates[0]);
                    const endDate = new Date(selectedDates[selectedDates.length - 1]);

                    // Régler l'heure à midi pour éviter les problèmes de fuseau horaire
                    startDate.setHours(12, 0, 0, 0);
                    endDate.setHours(12, 0, 0, 0);

                    let startDateInput = document.getElementById('activity-start-date');
                    let endDateInput = document.getElementById('activity-end-date');

                    if (!startDateInput) {
                        startDateInput = document.createElement('input');
                        startDateInput.type = 'hidden';
                        startDateInput.id = 'activity-start-date';
                        document.getElementById('activity-form').appendChild(startDateInput);
                    }

                    if (!endDateInput) {
                        endDateInput = document.createElement('input');
                        endDateInput.type = 'hidden';
                        endDateInput.id = 'activity-end-date';
                        document.getElementById('activity-form').appendChild(endDateInput);
                    }

                    // Format YYYY-MM-DD avec gestion du fuseau horaire
                    startDateInput.value = startDate.toISOString().split('T')[0];
                    endDateInput.value = endDate.toISOString().split('T')[0];
                }
            }
        });

// Gestion du thème
function initTheme() {
    const themeToggle = document.querySelector('#theme-toggle');
    console.log('Theme toggle button:', themeToggle);

    if (themeToggle) {
        const icon = themeToggle.querySelector('i');

        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(icon, savedTheme);

        themeToggle.addEventListener('click', function () {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(icon, newTheme);
            console.log('Theme changed to:', newTheme);
        });
    }
}

function updateThemeIcon(icon, theme) {
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        console.log('Icon updated:', icon.className);
    }
}

        function initStatistics() {
            const statsButton = document.querySelector('#stats-button');
            console.log('Statistics button:', statsButton);

            if (statsButton) {
                statsButton.addEventListener('click', function () {
                    console.log('Statistics button clicked');
                    try {
                        if (typeof ActivityStatistics === 'undefined') {
                            throw new Error('ActivityStatistics n\'est pas défini');
                        }
                        const stats = new ActivityStatistics();
                        stats.showStatistics();
                    } catch (error) {
                        console.error('Erreur lors de l\'affichage des statistiques:', error);
                        alert('Impossible d\'afficher les statistiques. Veuillez vérifier la console pour plus de détails.');
                    }
                });
            }
        }

        // Initialisation au chargement de la page
        document.addEventListener('DOMContentLoaded', function () {
            console.log('DOM Loaded'); // Debug

            // Supprimer les doublons potentiels
            const existingStatsButtons = document.querySelectorAll('.stats-button, #show-stats');
            existingStatsButtons.forEach((button, index) => {
                if (index > 0) button.remove();
            });

            const existingThemeButtons = document.querySelectorAll('.theme-button, #theme-toggle');
            existingThemeButtons.forEach((button, index) => {
                if (index > 0) button.remove();
            });

            // Initialiser les fonctionnalités
            initTheme();
            initStatistics();
            initNotifications();

            // Vérifier que les boutons sont bien présents
            console.log('Theme button:', document.querySelector('#theme-toggle')); // Debug
            console.log('Stats button:', document.querySelector('#stats-button')); // Debug
        });

        function initCategories() {
            const categories = JSON.parse(localStorage.getItem('categories')) || [
                { id: 'work', name: 'Travail', color: '#ff0000' },
                { id: 'meeting', name: 'Réunion', color: '#00ff00' },
                { id: 'break', name: 'Pause', color: '#0000ff' },
                { id: 'other', name: 'Autre', color: '#999999' }
            ];

            const select = document.getElementById('activity-category');
            const addButton = document.getElementById('add-category');

            // Remplir le select avec les catégories
            function updateCategorySelect() {
                select.innerHTML = '<option value="">Sélectionner une catégorie</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    option.style.color = category.color;
                    select.appendChild(option);
                });
            }

            // Gérer l'ajout de catégorie
            addButton.addEventListener('click', () => {
                const name = prompt('Nom de la nouvelle catégorie :');
                if (name) {
                    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
                    const id = name.toLowerCase().replace(/\s+/g, '-');
                    categories.push({ id, name, color });
                    localStorage.setItem('categories', JSON.stringify(categories));
                    updateCategorySelect();
                }
            });

            updateCategorySelect();
        }

        // Initialiser les notifications
        function initNotifications() {
            if ('Notification' in window) {
                Notification.requestPermission();
            }
        }

        // Afficher une notification
        function showNotification(title, message) {
            const notifContainer = document.getElementById('notifications-container');
            const notif = document.createElement('div');
            notif.className = 'notification';
            notif.innerHTML = `
                <h4>${title}</h4>
                <p>${message}</p>
            `;
            notifContainer.appendChild(notif);

            // Supprimer après 5 secondes
            setTimeout(() => {
                notif.remove();
            }, 5000);
        }

        // Initialiser les statistiques
        const stats = new ActivityStatistics();

        // Ajouter un bouton pour afficher les statistiques
        document.querySelector('.header-container').innerHTML += `
            <button id="show-stats" onclick="stats.showStatistics()">
                <i class="fas fa-chart-bar"></i> Statistiques
            </button>
        `;

        // Initialiser au chargement
        document.addEventListener('DOMContentLoaded', () => {
            initNotifications();
            // ... autres initialisations existantes
        });

        function initModal() {
            const modal = document.getElementById('modal');
            if (!modal) return;

            // Forcer la fermeture de la modale au chargement
            modal.style.display = "none";

            const openModalButton = document.getElementById('openModal');
            const closeModalSpan = document.querySelector('.close');

            if (openModalButton) {
                openModalButton.addEventListener('click', function () {
                    modal.style.display = 'block';
                    if (typeof resetModalFields === 'function') {
                        resetModalFields();
                    }
                });
            }

            if (closeModalSpan) {
                closeModalSpan.onclick = function () {
                    modal.style.display = "none";
                };
            }

            // Fermer la modale en cliquant en dehors
            window.onclick = function (event) {
                if (event.target === modal) {
                    modal.style.display = "none";
                }
            };
        }

        // S'assurer que la modale est cachée par défaut au chargement
        document.addEventListener('DOMContentLoaded', function () {
            const modal = document.getElementById('activity-modal');
            if (modal) {
                modal.style.display = "none";
            }
            initModal();
            // ... reste du code existant
        });
    }
});

// Attendre que tous les scripts soient chargés
document.addEventListener('DOMContentLoaded', () => {
    // Supprimer les doublons potentiels
    const existingStatsButtons = document.querySelectorAll('.stats-button, #show-stats');
    existingStatsButtons.forEach((button, index) => {
        if (index > 0) button.remove();
    });

    const existingThemeButtons = document.querySelectorAll('.theme-button, #theme-toggle');
    existingThemeButtons.forEach((button, index) => {
        if (index > 0) button.remove();
    });

    // Initialisation du thème
    const themeToggle = document.querySelector('#theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');

        // Charger le thème sauvegardé
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        ThemeManager.updateIcon(icon, savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(icon, newTheme);
        });
    }

    // Initialisation des statistiques
    const statsButton = document.querySelector('#stats-button');
    if (statsButton) {
        statsButton.addEventListener('click', () => {
            if (typeof ActivityStatistics !== 'undefined') {
                const stats = new ActivityStatistics();
                stats.showStatistics();
            } else {
                console.error('ActivityStatistics n\'est pas défini. Vérifiez que statistics.js est bien chargé.');
            }
        });
    }
});



