/* ==========================================================================
   Módulo de Geocolaboração - WebGIS Jaguaraçu
   ========================================================================== */

class GeoCollaborationManager {
    constructor(map) {
        this.map = map;
        this.storageKey = 'jaguaracu_webgis_colaboracoes';
        this.contributions = this.loadFromStorage();
        this.activeMarker = null;
        this.colabLayerGroup = L.layerGroup().addTo(this.map);
        this.isAddingPoint = false;

        this.initIcons();
        this.renderContributionsOnMap();
        this.renderContributionList();
        this.setupEventListeners();
    }

    initIcons() {
        this.categoryColors = {
            'Erosão / Riscos': '#dc2626',
            'Recursos Hídricos': '#0284c7',
            'Ponto Turístico': '#059669',
            'Denúncia Ambiental': '#d97706',
            'Infraestrutura Rural': '#4f46e5',
            'Outro': '#64748b'
        };
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Erro ao carregar dados do LocalStorage:', e);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.contributions));
            this.renderContributionList();
            this.renderContributionsOnMap();
        } catch (e) {
            console.error('Erro ao salvar no LocalStorage:', e);
        }
    }

    startAddingPoint() {
        this.isAddingPoint = true;
        this.map.getContainer().style.cursor = 'crosshair';

        // Notificação flutuante ou alerta
        alert('Clique em qualquer local do mapa para posicionar a sua contribuição.');

        const onMapClick = (e) => {
            if (!this.isAddingPoint) return;

            const { lat, lng } = e.latlng;
            document.getElementById('colab-lat').value = lat.toFixed(6);
            document.getElementById('colab-lng').value = lng.toFixed(6);

            // Remover marcador temporário anterior, se houver
            if (this.activeMarker) {
                this.map.removeLayer(this.activeMarker);
            }

            // Adicionar marcador temporário arrastável
            this.activeMarker = L.marker([lat, lng], {
                draggable: true,
                title: 'Nova Contribuição'
            }).addTo(this.map);

            this.activeMarker.bindPopup('<b>Posição Selecionada</b><br>Arraste se desejar ajustar a localização.').openPopup();

            this.activeMarker.on('dragend', (event) => {
                const position = event.target.getLatLng();
                document.getElementById('colab-lat').value = position.lat.toFixed(6);
                document.getElementById('colab-lng').value = position.lng.toFixed(6);
            });

            this.isAddingPoint = false;
            this.map.getContainer().style.cursor = '';
            this.map.off('click', onMapClick);
        };

        this.map.once('click', onMapClick);
    }

    addContribution(formData) {
        const newColab = {
            id: 'colab_' + Date.now(),
            title: formData.title,
            category: formData.category,
            description: formData.description,
            author: formData.author || 'Anônimo',
            contact: formData.contact || 'Não informado',
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            createdAt: new Date().toLocaleString('pt-BR')
        };

        this.contributions.push(newColab);
        this.saveToStorage();

        if (this.activeMarker) {
            this.map.removeLayer(this.activeMarker);
            this.activeMarker = null;
        }

        alert('Sua colaboração foi salva com sucesso no sistema!');
    }

    deleteContribution(id) {
        if (confirm('Deseja realmente remover esta contribuição?')) {
            this.contributions = this.contributions.filter(c => c.id !== id);
            this.saveToStorage();
        }
    }

    renderContributionsOnMap() {
        this.colabLayerGroup.clearLayers();

        this.contributions.forEach(colab => {
            const color = this.categoryColors[colab.category] || '#64748b';

            // Marcador estilizado circular
            const customIcon = L.divIcon({
                className: 'colab-custom-icon',
                html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;"><i class="fas fa-bullpin" style="font-size: 10px;"></i></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            const popupContent = `
                <div class="popup-header" style="background: ${color};">
                    <i class="fas fa-users"></i> ${colab.category}
                </div>
                <div class="popup-body">
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; color: #0f172a;">${colab.title}</h4>
                    <p style="font-size: 0.82rem; color: #334155; margin-bottom: 10px;">${colab.description}</p>
                    <table class="popup-table">
                        <tr><th>Colaborador:</th><td>${colab.author}</td></tr>
                        <tr><th>Data:</th><td>${colab.createdAt}</td></tr>
                        <tr><th>Coordenadas:</th><td>${colab.lat.toFixed(5)}, ${colab.lng.toFixed(5)}</td></tr>
                    </table>
                </div>
            `;

            const marker = L.marker([colab.lat, colab.lng], { icon: customIcon });
            marker.bindPopup(popupContent);
            this.colabLayerGroup.addLayer(marker);
        });
    }

    renderContributionList() {
        const container = document.getElementById('colab-items-container');
        if (!container) return;

        if (this.contributions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 20px 10px; font-size: 0.85rem;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;"></i><br>
                    Nenhuma colaboração registrada ainda.<br>Seja o primeiro a colaborar!
                </div>
            `;
            return;
        }

        container.innerHTML = this.contributions.map(c => `
            <div class="colab-item">
                <div class="colab-item-title">${c.title}</div>
                <span class="colab-item-cat" style="background: ${this.categoryColors[c.category] || '#e0f2fe'}20; color: ${this.categoryColors[c.category] || '#0369a1'};">
                    ${c.category}
                </span>
                <p style="color: var(--text-main); margin-bottom: 6px;">${c.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.75rem; color: var(--text-muted);">
                    <span><i class="fas fa-user"></i> ${c.author}</span>
                    <div>
                        <button onclick="window.colabManager.zoomTo('${c.id}')" style="background: none; border: none; color: var(--accent-color); cursor: pointer; margin-right: 8px;" title="Ver no Mapa">
                            <i class="fas fa-search-location"></i> Ver
                        </button>
                        <button onclick="window.colabManager.deleteContribution('${c.id}')" style="background: none; border: none; color: var(--danger-color); cursor: pointer;" title="Excluir">
                            <i class="fas fa-trash-alt"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    zoomTo(id) {
        const colab = this.contributions.find(c => c.id === id);
        if (colab) {
            this.map.setView([colab.lat, colab.lng], 16, { animate: true });
            // Procurar marker no layergroup e abrir popup
            this.colabLayerGroup.eachLayer(layer => {
                const latlng = layer.getLatLng();
                if (Math.abs(latlng.lat - colab.lat) < 0.0001 && Math.abs(latlng.lng - colab.lng) < 0.0001) {
                    layer.openPopup();
                }
            });
        }
    }

    exportToGeoJSON() {
        if (this.contributions.length === 0) {
            alert('Não há nenhuma colaboração para exportar.');
            return;
        }

        const geojson = {
            type: "FeatureCollection",
            name: "colaboracoes_jaguaracu",
            features: this.contributions.map(c => ({
                type: "Feature",
                properties: {
                    id: c.id,
                    titulo: c.title,
                    categoria: c.category,
                    descricao: c.description,
                    colaborador: c.author,
                    contato: c.contact,
                    data_registro: c.createdAt
                },
                geometry: {
                    type: "Point",
                    coordinates: [c.lng, c.lat]
                }
            }))
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `colaboracoes_jaguaracu_${Date.now()}.geojson`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    setupEventListeners() {
        const btnMarkPoint = document.getElementById('btn-colab-mark-point');
        if (btnMarkPoint) {
            btnMarkPoint.addEventListener('click', () => this.startAddingPoint());
        }

        const form = document.getElementById('form-colaboracao');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    title: document.getElementById('colab-title').value,
                    category: document.getElementById('colab-category').value,
                    description: document.getElementById('colab-description').value,
                    author: document.getElementById('colab-author').value,
                    contact: document.getElementById('colab-contact').value,
                    lat: document.getElementById('colab-lat').value,
                    lng: document.getElementById('colab-lng').value
                };

                if (!formData.lat || !formData.lng) {
                    alert('Por favor, selecione primeiro a localização no mapa clicando no botão "Marcar no Mapa".');
                    return;
                }

                this.addContribution(formData);
                form.reset();
                document.getElementById('colab-lat').value = '';
                document.getElementById('colab-lng').value = '';
            });
        }

        const btnExport = document.getElementById('btn-colab-export');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportToGeoJSON());
        }
    }
}
