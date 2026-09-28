/* ==========================================================================
   Módulo de Medição de Distância e Área - WebGIS Jaguaraçu
   ========================================================================== */

class GeoMeasureManager {
    constructor(map) {
        this.map = map;
        this.activeMode = null; // 'distance' ou 'area'
        this.points = [];
        this.markers = [];
        this.measureLayerGroup = L.layerGroup().addTo(this.map);
        this.tempLine = null;
        this.tempPolygon = null;
        this.tooltip = null;

        this.initUI();
    }

    initUI() {
        // Criar barra flutuante de medição sobre o mapa
        const container = document.createElement('div');
        container.id = 'measure-control-bar';
        container.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 990;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            padding: 6px 12px;
            display: none;
            align-items: center;
            gap: 10px;
            border: 1px solid var(--border-color);
        `;

        container.innerHTML = `
            <span id="measure-instruction" style="font-size: 0.82rem; font-weight: 600; color: var(--primary-dark);">
                <i class="fas fa-ruler-combined"></i> Clique no mapa para medir
            </span>
            <button id="btn-measure-dist" class="btn-nav" style="background: #2563eb; padding: 4px 10px; font-size: 0.78rem;">
                <i class="fas fa-ruler"></i> Distância
            </button>
            <button id="btn-measure-area" class="btn-nav" style="background: #059669; padding: 4px 10px; font-size: 0.78rem;">
                <i class="fas fa-draw-polygon"></i> Área
            </button>
            <button id="btn-measure-clear" class="btn-nav" style="background: #dc2626; padding: 4px 10px; font-size: 0.78rem;">
                <i class="fas fa-trash-alt"></i> Limpar
            </button>
            <button id="btn-measure-close" class="btn-close-sidebar" style="font-size: 0.9rem;">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.getElementById('main-content').appendChild(container);

        // Listeners dos botões da barra flutuante
        document.getElementById('btn-measure-dist').addEventListener('click', () => this.startMeasure('distance'));
        document.getElementById('btn-measure-area').addEventListener('click', () => this.startMeasure('area'));
        document.getElementById('btn-measure-clear').addEventListener('click', () => this.clearAll());
        document.getElementById('btn-measure-close').addEventListener('click', () => this.stopMeasure());

        // Botão na Navbar
        const btnNavbarRuler = document.getElementById('btn-nav-ruler');
        if (btnNavbarRuler) {
            btnNavbarRuler.addEventListener('click', () => {
                const bar = document.getElementById('measure-control-bar');
                if (bar.style.display === 'none' || !bar.style.display) {
                    bar.style.display = 'flex';
                    this.startMeasure('distance');
                } else {
                    this.stopMeasure();
                }
            });
        }
    }

    startMeasure(mode) {
        this.clearAll();
        this.activeMode = mode;
        this.map.getContainer().style.cursor = 'crosshair';

        const instr = document.getElementById('measure-instruction');
        if (mode === 'distance') {
            if (instr) instr.innerHTML = '<i class="fas fa-ruler" style="color: #2563eb;"></i> Clique para medir <b>Distância</b> (Dê um duplo clique para finalizar)';
        } else {
            if (instr) instr.innerHTML = '<i class="fas fa-draw-polygon" style="color: #059669;"></i> Clique para medir <b>Área</b> (Dê um duplo clique para finalizar)';
        }

        this.map.on('click', this.onMapClick, this);
        this.map.on('mousemove', this.onMouseMove, this);
        this.map.on('dblclick', this.onMapDblClick, this);
    }

    stopMeasure() {
        this.activeMode = null;
        this.map.getContainer().style.cursor = '';
        const bar = document.getElementById('measure-control-bar');
        if (bar) bar.style.display = 'none';

        this.map.off('click', this.onMapClick, this);
        this.map.off('mousemove', this.onMouseMove, this);
        this.map.off('dblclick', this.onMapDblClick, this);

        if (this.tooltip) {
            this.map.removeLayer(this.tooltip);
            this.tooltip = null;
        }
    }

    onMapClick(e) {
        if (!this.activeMode) return;

        const latlng = e.latlng;
        this.points.push(latlng);

        // Adicionar marcador no vértice
        const vertexMarker = L.circleMarker(latlng, {
            radius: 5,
            color: this.activeMode === 'distance' ? '#2563eb' : '#059669',
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 2
        }).addTo(this.measureLayerGroup);

        this.markers.push(vertexMarker);

        this.updateGeometry();
    }

    onMouseMove(e) {
        if (!this.activeMode || this.points.length === 0) return;

        const currentLatLng = e.latlng;
        const tempPoints = [...this.points, currentLatLng];

        // Atualizar linha ou polígono temporário
        if (this.activeMode === 'distance') {
            if (this.tempLine) this.map.removeLayer(this.tempLine);
            this.tempLine = L.polyline(tempPoints, { color: '#2563eb', weight: 3, dashArray: '6, 6' }).addTo(this.map);
        } else if (this.activeMode === 'area' && tempPoints.length >= 3) {
            if (this.tempPolygon) this.map.removeLayer(this.tempPolygon);
            this.tempPolygon = L.polygon(tempPoints, { color: '#059669', weight: 2, fillColor: '#059669', fillOpacity: 0.25, dashArray: '4, 4' }).addTo(this.map);
        }

        // Tooltip com medição em tempo real
        this.updateTooltip(currentLatLng, tempPoints);
    }

    onMapDblClick(e) {
        if (!this.activeMode) return;
        L.DomEvent.stopPropagation(e);

        this.updateGeometry(true);
        this.map.getContainer().style.cursor = '';
        this.activeMode = null;
    }

    updateGeometry(isFinal = false) {
        if (this.points.length < 2) return;

        if (this.activeMode === 'distance') {
            if (this.tempLine) this.map.removeLayer(this.tempLine);
            const line = L.polyline(this.points, { color: '#2563eb', weight: 4 }).addTo(this.measureLayerGroup);

            const totalDist = this.calculateDistance(this.points);
            const formattedDist = this.formatDistance(totalDist);

            const lastPoint = this.points[this.points.length - 1];
            const label = L.marker(lastPoint, {
                icon: L.divIcon({
                    className: 'measure-result-label',
                    html: `<div style="background: #1e3a8a; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;"><i class="fas fa-ruler"></i> ${formattedDist}</div>`,
                    iconAnchor: [-10, 10]
                })
            }).addTo(this.measureLayerGroup);
        } else if (this.activeMode === 'area' && this.points.length >= 3) {
            if (this.tempPolygon) this.map.removeLayer(this.tempPolygon);
            const poly = L.polygon(this.points, { color: '#059669', weight: 3, fillColor: '#10b981', fillOpacity: 0.35 }).addTo(this.measureLayerGroup);

            const areaM2 = this.calculateArea(this.points);
            const formattedArea = this.formatArea(areaM2);

            const center = poly.getBounds().getCenter();
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'measure-result-label',
                    html: `<div style="background: #047857; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;"><i class="fas fa-draw-polygon"></i> ${formattedArea}</div>`,
                    iconAnchor: [0, 0]
                })
            }).addTo(this.measureLayerGroup);
        }
    }

    updateTooltip(latlng, tempPoints) {
        let text = '';
        if (this.activeMode === 'distance') {
            const dist = this.calculateDistance(tempPoints);
            text = `<b>Distância:</b> ${this.formatDistance(dist)}`;
        } else if (this.activeMode === 'area') {
            if (tempPoints.length >= 3) {
                const area = this.calculateArea(tempPoints);
                text = `<b>Área:</b> ${this.formatArea(area)}`;
            } else {
                text = 'Clique para adicionar pelo menos 3 pontos';
            }
        }

        if (!this.tooltip) {
            this.tooltip = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'measure-tooltip',
                    html: `<div style="background: rgba(15, 23, 42, 0.85); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; white-space: nowrap;">${text}</div>`,
                    iconAnchor: [-10, -10]
                })
            }).addTo(this.map);
        } else {
            this.tooltip.setLatLng(latlng);
            this.tooltip.setIcon(L.divIcon({
                className: 'measure-tooltip',
                html: `<div style="background: rgba(15, 23, 42, 0.85); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; white-space: nowrap;">${text}</div>`,
                iconAnchor: [-10, -10]
            }));
        }
    }

    calculateDistance(points) {
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            total += points[i].distanceTo(points[i + 1]);
        }
        return total;
    }

    calculateArea(latLngs) {
        // Cálculo Geodésico de Área Esférica (Fórmula de Shoelace aproximada para latitude/longitude)
        const radius = 6378137; // Raio da Terra em metros
        let area = 0;
        const len = latLngs.length;

        if (len < 3) return 0;

        for (let i = 0; i < len; i++) {
            const p1 = latLngs[i];
            const p2 = latLngs[(i + 1) % len];
            area += (this.toRadians(p2.lng) - this.toRadians(p1.lng)) *
                    (2 + Math.sin(this.toRadians(p1.lat)) + Math.sin(this.toRadians(p2.lat)));
        }

        area = area * radius * radius / 2.0;
        return Math.abs(area);
    }

    toRadians(deg) {
        return deg * (Math.PI / 180);
    }

    formatDistance(meters) {
        if (meters >= 1000) {
            return (meters / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km';
        }
        return Math.round(meters).toLocaleString('pt-BR') + ' m';
    }

    formatArea(sqMeters) {
        const hectares = sqMeters / 10000;
        if (hectares >= 1) {
            return hectares.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ha (' + (sqMeters / 1e6).toFixed(3) + ' km²)';
        }
        return Math.round(sqMeters).toLocaleString('pt-BR') + ' m²';
    }

    clearAll() {
        this.points = [];
        this.markers = [];
        this.measureLayerGroup.clearLayers();
        if (this.tempLine) {
            this.map.removeLayer(this.tempLine);
            this.tempLine = null;
        }
        if (this.tempPolygon) {
            this.map.removeLayer(this.tempPolygon);
            this.tempPolygon = null;
        }
        if (this.tooltip) {
            this.map.removeLayer(this.tooltip);
            this.tooltip = null;
        }
    }
}
