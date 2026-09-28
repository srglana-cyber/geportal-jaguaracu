/* ==========================================================================
   Geoportal de Jaguaraçu - MG | WebGIS Interativo
   Coordenação e Autoria: Professor Sérgio Lana (Currículo Lattes)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // 1. Inicializar o Mapa Leaflet centrado em Jaguaraçu-MG
    // --------------------------------------------------------------------------
    const initialCenter = [-19.6268, -42.7161]; // Centroide exato do município de Jaguaraçu
    const initialZoom = 12;

    const map = L.map('map', {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false
    });

    // Controle de zoom no canto superior direito
    L.control.zoom({ position: 'topright' }).addTo(map);

    // --------------------------------------------------------------------------
    // 2. Mapas de Fundo (Basemaps)
    // --------------------------------------------------------------------------
    const basemaps = {
        satellite: L.layerGroup([
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri &mdash; Geoportal Jaguaraçu | Autoria: Prof. Sérgio Lana'
            }),
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                opacity: 0.7
            }),
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                opacity: 0.85
            })
        ]),

        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Autoria: Prof. Sérgio Lana'
        }),

        osm: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a> | Geoportal Jaguaraçu'
        })
    };

    // Basemap padrão (Satélite)
    basemaps.satellite.addTo(map);

    // Alternador de Basemaps
    const basemapOptions = document.querySelectorAll('.basemap-option');
    basemapOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const selected = opt.getAttribute('data-basemap');
            Object.values(basemaps).forEach(b => map.removeLayer(b));
            if (basemaps[selected]) {
                basemaps[selected].addTo(map);
            }
            basemapOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // --------------------------------------------------------------------------
    // 3. Utilitário de Exportação KML 2.2 (Google Earth)
    // --------------------------------------------------------------------------
    function exportGeoJSONToKML(geojsonData, layerName) {
        if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
            alert('Não há dados disponíveis para exportar nesta camada.');
            return;
        }

        function escapeXml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        function coordToStr(c) {
            const lon = c[0];
            const lat = c[1];
            const alt = c[2] !== undefined ? c[2] : 0;
            return `${lon},${lat},${alt}`;
        }

        function ringToKML(ring) {
            return ring.map(coordToStr).join(' ');
        }

        function geometryToKML(geometry) {
            if (!geometry) return '';
            const type = geometry.type;
            const coords = geometry.coordinates;

            switch (type) {
                case 'Point':
                    return `<Point><coordinates>${coordToStr(coords)}</coordinates></Point>`;
                case 'MultiPoint':
                    return `<MultiGeometry>${coords.map(c => `<Point><coordinates>${coordToStr(c)}</coordinates></Point>`).join('')}</MultiGeometry>`;
                case 'LineString':
                    return `<LineString><tessellate>1</tessellate><coordinates>${coords.map(coordToStr).join(' ')}</coordinates></LineString>`;
                case 'MultiLineString':
                    return `<MultiGeometry>${coords.map(line => `<LineString><tessellate>1</tessellate><coordinates>${line.map(coordToStr).join(' ')}</coordinates></LineString>`).join('')}</MultiGeometry>`;
                case 'Polygon':
                    return `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${ringToKML(coords[0])}</coordinates></LinearRing></outerBoundaryIs>${coords.slice(1).map(inner => `<innerBoundaryIs><LinearRing><coordinates>${ringToKML(inner)}</coordinates></LinearRing></innerBoundaryIs>`).join('')}</Polygon>`;
                case 'MultiPolygon':
                    return `<MultiGeometry>${coords.map(poly => `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${ringToKML(poly[0])}</coordinates></LinearRing></outerBoundaryIs>${poly.slice(1).map(inner => `<innerBoundaryIs><LinearRing><coordinates>${ringToKML(inner)}</coordinates></LinearRing></innerBoundaryIs>`).join('')}</Polygon>`).join('')}</MultiGeometry>`;
                case 'GeometryCollection':
                    return `<MultiGeometry>${geometry.geometries.map(geometryToKML).join('')}</MultiGeometry>`;
                default:
                    return '';
            }
        }

        let placemarks = '';
        geojsonData.features.forEach((feat, index) => {
            const props = feat.properties || {};
            const geom = feat.geometry;
            if (!geom) return;

            const name = props.Atrativo || props.NOME || props.nome || props.name || props.cod_imovel || props.UNIDADE || props.noriocomp || props.noespecif || props.NM_MUN || props.categoria || `Feição ${index + 1}`;

            let descRows = '';
            let extendedData = '';
            for (const [key, val] of Object.entries(props)) {
                if (val !== null && val !== undefined) {
                    const strVal = String(val);
                    descRows += `<tr><td><b>${escapeXml(key)}</b></td><td>${escapeXml(strVal)}</td></tr>`;
                    extendedData += `<Data name="${escapeXml(key)}"><value>${escapeXml(strVal)}</value></Data>`;
                }
            }

            const description = `<![CDATA[
                <h3>${escapeXml(name)}</h3>
                <p><b>Camada:</b> ${escapeXml(layerName)}</p>
                <p><b>Fonte das informações geoespaciais:</b> INDE (Infraestrutura Nacional de Dados Espaciais), IDE-SISEMA e Prefeitura Municipal de Jaguaraçu.</p>
                <p><b>Adaptação e Prototipação:</b> <a href="http://lattes.cnpq.br/2773267607623633">Prof. Sérgio Lana</a></p>
                <table border="1" cellpadding="3" cellspacing="0" style="border-collapse: collapse; font-family: sans-serif; font-size: 11px;">
                    ${descRows}
                </table>
            ]]>`;

            placemarks += `
            <Placemark>
                <name>${escapeXml(name)}</name>
                <description>${description}</description>
                <ExtendedData>${extendedData}</ExtendedData>
                ${geometryToKML(geom)}
            </Placemark>`;
        });

        const kmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(layerName || 'camada_geoportal')}</name>
    <description>Geoportal de Jaguaraçu - MG | Fonte das informações geoespaciais: INDE (Infraestrutura Nacional de Dados Espaciais), IDE-SISEMA (Sistema Estadual de Meio Ambiente e Desenvolvimento Sustentável de MG) e Prefeitura Municipal de Jaguaraçu. Adaptação e Prototipação: Prof. Sérgio Lana (http://lattes.cnpq.br/2773267607623633)</description>
    ${placemarks}
  </Document>
</kml>`;

        const blob = new Blob([kmlDoc], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (layerName || 'camada').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9_-]/g, '_');
        a.href = downloadUrl;
        a.download = `${safeName}.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }

    // --------------------------------------------------------------------------
    // 4. Definições de Simbologia Temática por Atributos & Legendas Customizáveis
    // --------------------------------------------------------------------------
    const THEMATIC_CONFIG = {
        distritos: {
            title: 'Limites Distritais',
            fieldDesc: 'Divisão Político-Administrativa / Distritos',
            getClass: (feat) => {
                const p = feat.properties || {};
                const cod = String(p.geocodigo || '');
                const nome = (p.nome || '').toLowerCase();
                if (cod === '313500105' || (nome.includes('jaguara') && !nome.includes('lavrinha'))) return 'SEDE';
                if (cod === '313500116' || nome.includes('lagoa')) return 'LAGOA_DE_PAU';
                if (cod === '313500120' || nome.includes('lavrinha')) return 'LAVRINHA';
                return 'ENTORNO';
            },
            classes: {
                'SEDE': { label: 'Distrito Sede (Jaguaraçu)', color: '#7e22ce', fill: '#a855f7' },
                'LAGOA_DE_PAU': { label: 'Distrito de Lagoa de Pau', color: '#0284c7', fill: '#38bdf8' },
                'LAVRINHA': { label: 'Distrito de Lavrinha de Jaguaraçu', color: '#059669', fill: '#10b981' },
                'ENTORNO': { label: 'Distritos Limítrofes (Entorno)', color: '#475569', fill: '#94a3b8' }
            }
        },

        setores_censitarios: {
            title: 'Setores Censitários (IBGE)',
            fieldDesc: 'Classificação por Situação (Urbano / Rural)',
            getClass: (feat) => {
                const tipo = (feat.properties && feat.properties.TIPO) ? feat.properties.TIPO.toUpperCase() : 'OUTRO';
                return tipo.includes('URB') ? 'URBANO' : 'RURAL';
            },
            classes: {
                'URBANO': { label: 'Setor Urbano (IBGE)', color: '#1d4ed8', fill: '#3b82f6' },
                'RURAL': { label: 'Setor Rural (IBGE)', color: '#047857', fill: '#10b981' }
            }
        },

        areas_prioritarias_conservacao: {
            title: 'Áreas Prioritárias para Conservação',
            fieldDesc: 'Nível de Prioridade Biológica',
            getClass: (feat) => {
                const cat = (feat.properties && (feat.properties.categoria || feat.properties.classe || '')).toUpperCase();
                if (cat.includes('MUITO') || cat.includes('EXTREMA')) return 'MUITO_ALTA';
                return 'ALTA';
            },
            classes: {
                'MUITO_ALTA': { label: 'Prioridade Muito Alta / Extrema', color: '#b91c1c', fill: '#ef4444' },
                'ALTA': { label: 'Prioridade Alta', color: '#d97706', fill: '#f59e0b' }
            }
        },

        vegetacao: {
            title: 'Cobertura Vegetal e Uso do Solo',
            fieldDesc: 'Tipologias Vegetais e Uso da Terra',
            getClass: (feat) => {
                const text = JSON.stringify(feat.properties || {}).toLowerCase();
                if (text.includes('eucalipto') || text.includes('reflorestamento')) return 'EUCALIPTO';
                if (text.includes('pastagem') || text.includes('pecuaria')) return 'PASTAGEM';
                if (text.includes('floresta') || text.includes('secundaria')) return 'FLORESTA';
                if (text.includes('agua') || text.includes('corpo')) return 'AGUA';
                return 'OUTROS';
            },
            classes: {
                'EUCALIPTO': { label: 'Florestamento / Eucaliptos', color: '#14532d', fill: '#16a34a' },
                'PASTAGEM': { label: 'Pecuária / Pastagens', color: '#ca8a04', fill: '#facc15' },
                'FLORESTA': { label: 'Floresta / Veg. Secundária', color: '#15803d', fill: '#4ade80' },
                'AGUA': { label: 'Corpos D\'água Continentais', color: '#0284c7', fill: '#38bdf8' },
                'OUTROS': { label: 'Áreas Antrópicas Dominantes', color: '#b45309', fill: '#d97706' }
            }
        },

        pedologia: {
            title: 'Mapeamento Pedológico (Solos)',
            fieldDesc: 'Ordens e Subordens de Solos (SiBCS)',
            getClass: (feat) => {
                const p = feat.properties || {};
                const text = (p.leg_ordem || p.ordem || p.legenda_2 || p.legenda || '').toUpperCase();
                if (text.includes('LATOSSOLO')) return 'LATOSSOLO';
                if (text.includes('ARGISSOLO')) return 'ARGISSOLO';
                if (text.includes('CAMBISSOLO')) return 'CAMBISSOLO';
                if (text.includes('URBANA')) return 'URBANA';
                return 'OUTROS';
            },
            classes: {
                'LATOSSOLO': { label: 'Latossolo Vermelho-Amarelo', color: '#9a3412', fill: '#ea580c' },
                'ARGISSOLO': { label: 'Argissolo Vermelho', color: '#b45309', fill: '#f97316' },
                'CAMBISSOLO': { label: 'Cambissolo Háplico', color: '#ca8a04', fill: '#eab308' },
                'URBANA': { label: 'Área Urbana Consolidada', color: '#475569', fill: '#94a3b8' },
                'OUTROS': { label: 'Outras Unidades Pedológicas', color: '#78350f', fill: '#a16207' }
            }
        },

        geomorfologia: {
            title: 'Geomorfologia e Relevo',
            fieldDesc: 'Aprofundamento da Dissecação do Relevo',
            getClass: (feat) => {
                const aprof = (feat.properties && feat.properties.aprof_inci ? feat.properties.aprof_inci : '').toLowerCase();
                if (aprof.includes('forte') || aprof.includes('150 a 200')) return 'FORTE';
                return 'MEDIO';
            },
            classes: {
                'FORTE': { label: 'Dissecação Forte (> 150 a 200m)', color: '#78350f', fill: '#9a3412' },
                'MEDIO': { label: 'Dissecação Média (> 100 a 150m)', color: '#b45309', fill: '#d97706' }
            }
        },

        geologia: {
            title: 'Mapeamento Geológico',
            fieldDesc: 'Unidades Litoestratigráficas',
            getClass: (feat) => {
                const p = feat.properties || {};
                const name = (p.nm_unidade || p.UNIDADE || p.SIGLA_MG || '').toLowerCase();
                if (name.includes('mantiqueira')) return 'MANTIQUEIRA';
                if (name.includes('açucena') || name.includes('acucena')) return 'ACUCENA';
                if (name.includes('terraço') || name.includes('terraco')) return 'TERRACOS';
                if (name.includes('aluvion') || name.includes('aluvial')) return 'ALUVIONARES';
                if (name.includes('tomé') || name.includes('tome')) return 'SAO_TOME';
                if (name.includes('velhas')) return 'RIO_DAS_VELHAS';
                return 'OUTROS';
            },
            classes: {
                'MANTIQUEIRA': { label: 'Complexo Mantiqueira (Ortognaisses)', color: '#6b21a8', fill: '#9333ea' },
                'ACUCENA': { label: 'Granito Açucena (Augen-Gnaisse)', color: '#b91c1c', fill: '#ef4444' },
                'TERRACOS': { label: 'Terraços Holocênicos', color: '#d97706', fill: '#f59e0b' },
                'ALUVIONARES': { label: 'Depósitos Aluvionares Recentes', color: '#ca8a04', fill: '#eab308' },
                'SAO_TOME': { label: 'Grupo São Tomé (Xistos/Metassedimentos)', color: '#0369a1', fill: '#0ea5e9' },
                'RIO_DAS_VELHAS': { label: 'Supergrupo Rio das Velhas', color: '#047857', fill: '#10b981' },
                'OUTROS': { label: 'Outras Litofácies', color: '#475569', fill: '#64748b' }
            }
        },

        erosao: {
            title: 'Suscetibilidade à Erosão',
            fieldDesc: 'Vulnerabilidade a Processos Erosivos',
            getClass: (feat) => {
                const text = JSON.stringify(feat.properties || {}).toLowerCase();
                if (text.includes('mantiqueira') || text.includes('a3m')) return 'MANTIQUEIRA';
                return 'ACUCENA';
            },
            classes: {
                'MANTIQUEIRA': { label: 'Alta Suscetibilidade (Complexo Mantiqueira)', color: '#dc2626', fill: '#ef4444' },
                'ACUCENA': { label: 'Moderada a Forte (Gnaisse Açucena)', color: '#ea580c', fill: '#f97316' }
            }
        },

        circunscricoes_hidrograficas: {
            title: 'Circunscrições Hidrográficas',
            fieldDesc: 'Bacias e Sub-bacias Hidrográficas (CBH)',
            getClass: (feat) => {
                const p = feat.properties || {};
                const sigla = (p.sigla || '').toUpperCase();
                const nome = (p.nome || '').toLowerCase();
                if (sigla === 'DO2' || nome.includes('piracicaba')) return 'DO2';
                return 'DO1';
            },
            classes: {
                'DO2': { label: 'DO2: Bacia do Rio Piracicaba (CBH Piracicaba)', color: '#0369a1', fill: '#0284c7' },
                'DO1': { label: 'DO1: Bacia do Rio Piranga (CBH Piranga)', color: '#0f766e', fill: '#14b8a6' }
            }
        },

        car: {
            title: 'Cadastro Ambiental Rural (CAR)',
            fieldDesc: 'Condição e Status do Imóvel Rural',
            getClass: (feat) => {
                const status = (feat.properties && feat.properties.ind_status) ? feat.properties.ind_status.toUpperCase() : 'AT';
                return status === 'PE' ? 'PE' : 'AT';
            },
            classes: {
                'AT': { label: 'Aguardando Análise (AT)', color: '#ea580c', fill: '#f97316' },
                'PE': { label: 'Analisado / Notificado (PE)', color: '#0d9488', fill: '#14b8a6' }
            }
        }
    };

    // --------------------------------------------------------------------------
    // 5. Configuração Centralizada das 21 Camadas Geográficas
    // --------------------------------------------------------------------------
    const LAYERS_CONFIG = [
        {
            id: 'mascara',
            name: 'Limite Municipal (Jaguaraçu)',
            varName: 'GEO_DATA_mascara_jaguaracu',
            badge: 'Fronteira',
            geomType: 'polygon',
            active: true, // ÚNICA ATIVA POR PADRÃO
            interactive: false, // Permite clicar nas camadas de interesse abaixo
            style: { color: '#7e22ce', weight: 3.5, dashArray: '6, 6', fill: false, fillOpacity: 0 },
            baseZIndex: 350
        },
        {
            id: 'distritos',
            name: 'Limites Distritais',
            varName: 'GEO_DATA_distritos',
            badge: 'Distritos',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#7e22ce', weight: 2.2, fillColor: '#c084fc', fillOpacity: 0.35 },
            baseZIndex: 360
        },
        {
            id: 'setores_censitarios',
            name: 'Setores Censitários (IBGE)',
            varName: 'GEO_DATA_setores_censitarios',
            badge: 'Censo',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#1d4ed8', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.35 },
            baseZIndex: 370
        },
        {
            id: 'car',
            name: 'Cadastro Ambiental Rural (CAR)',
            varName: 'GEO_DATA_area_imoveis_CAR',
            badge: 'Imóveis',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#ea580c', weight: 1.8, fillColor: '#f97316', fillOpacity: 0.4 },
            baseZIndex: 430
        },
        {
            id: 'apa',
            name: 'APA Jaguaraçu (Lei 555/98)',
            varName: 'GEO_DATA_limite_APA',
            badge: 'Proteção',
            geomType: 'polygon',
            active: false,
            style: { color: '#15803d', weight: 2.5, dashArray: '4, 4', fillColor: '#22c55e', fillOpacity: 0.22 },
            baseZIndex: 380
        },
        {
            id: 'areas_prioritarias_conservacao',
            name: 'Áreas Prioritárias para Conservação',
            varName: 'GEO_DATA_areas_prioritarias_conservacao',
            badge: 'Biodiversidade',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#b91c1c', weight: 2, fillColor: '#ef4444', fillOpacity: 0.35 },
            baseZIndex: 390
        },
        {
            id: 'vegetacao',
            name: 'Cobertura Vegetal e Uso do Solo',
            varName: 'GEO_DATA_vegetacao',
            badge: 'Vegetação',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#14532d', weight: 1.5, fillColor: '#16a34a', fillOpacity: 0.4 },
            baseZIndex: 400
        },
        {
            id: 'pedologia',
            name: 'Mapeamento Pedológico (Solos)',
            varName: 'GEO_DATA_pedologia',
            badge: 'Solos',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#9a3412', weight: 1.5, fillColor: '#ea580c', fillOpacity: 0.4 },
            baseZIndex: 410
        },
        {
            id: 'geomorfologia',
            name: 'Geomorfologia e Relevo',
            varName: 'GEO_DATA_geomorfologia',
            badge: 'Relevo',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#78350f', weight: 1.5, fillColor: '#9a3412', fillOpacity: 0.4 },
            baseZIndex: 415
        },
        {
            id: 'geologia',
            name: 'Mapeamento Geológico',
            varName: 'GEO_DATA_geologia',
            badge: 'Geologia',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#6b21a8', weight: 1.5, fillColor: '#9333ea', fillOpacity: 0.45 },
            baseZIndex: 420
        },
        {
            id: 'erosao',
            name: 'Suscetibilidade à Erosão',
            varName: 'GEO_DATA_erosao',
            badge: 'Risco',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#dc2626', weight: 1.8, fillColor: '#ef4444', fillOpacity: 0.4 },
            baseZIndex: 425
        },
        {
            id: 'circunscricoes_hidrograficas',
            name: 'Circunscrições Hidrográficas',
            varName: 'GEO_DATA_circunscricoes_hidrograficas',
            badge: 'Bacia',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#0369a1', weight: 2.5, fillColor: '#0284c7', fillOpacity: 0.35 },
            baseZIndex: 428
        },
        {
            id: 'hidrografia',
            name: 'Rede Hidrográfica e Rios',
            varName: 'GEO_DATA_hidrografia',
            badge: 'Rios',
            geomType: 'line',
            active: false,
            style: { color: '#0284c7', weight: 2.5, opacity: 0.85 },
            customStyler: (feature) => {
                const props = feature.properties || {};
                const isPiracicaba = (props.noespecif && props.noespecif.toLowerCase().includes('piracicaba')) ||
                                     (props.noriocomp && props.noriocomp.toLowerCase().includes('piracicaba'));
                return {
                    color: isPiracicaba ? '#0284c7' : '#38bdf8',
                    weight: isPiracicaba ? 4.5 : (props.nustrahler > 3 ? 2.5 : 1.5),
                    opacity: isPiracicaba ? 0.95 : 0.8
                };
            },
            baseZIndex: 490
        },
        {
            id: 'rodovia_federal',
            name: 'Rodovia Federal (BR-381)',
            varName: 'GEO_DATA_rodovia_federal',
            badge: 'BR-381',
            geomType: 'line',
            active: false,
            style: { color: '#dc2626', weight: 4.5, opacity: 0.95 },
            baseZIndex: 500
        },
        {
            id: 'rodovias',
            name: 'Rodovias Estaduais / Acessos',
            varName: 'GEO_DATA_rodovias',
            badge: 'Rodovias',
            geomType: 'line',
            active: false,
            style: { color: '#ea580c', weight: 3.2, opacity: 0.9 },
            baseZIndex: 505
        },
        {
            id: 'estradas_municipais',
            name: 'Estradas Vicinais e Municipais',
            varName: 'GEO_DATA_estradas_municipais',
            badge: 'Vicinais',
            geomType: 'line',
            active: false,
            style: { color: '#d97706', weight: 2.2, opacity: 0.85 },
            baseZIndex: 510
        },
        {
            id: 'faces_logradouros',
            name: 'Faces de Logradouros Urbanos',
            varName: 'GEO_DATA_faces_logradouros',
            badge: 'Ruas',
            geomType: 'line',
            active: false,
            style: { color: '#64748b', weight: 1.6, opacity: 0.8 },
            baseZIndex: 515
        },
        {
            id: 'cicloturismo',
            name: 'Rotas de Cicloturismo',
            varName: 'GEO_DATA_cicloturismo',
            badge: 'Turismo',
            geomType: 'line',
            active: false,
            style: { color: '#16a34a', weight: 3.2, dashArray: '6, 4', opacity: 0.95 },
            baseZIndex: 520
        },
        {
            id: 'sede_municipal',
            name: 'Sede Municipal de Jaguaraçu',
            varName: 'GEO_DATA_sede_municipal',
            badge: 'Sede',
            geomType: 'point',
            active: false,
            style: { color: '#ffffff', fillColor: '#b91c1c', radius: 8, weight: 2.5 },
            baseZIndex: 580
        },
        {
            id: 'estabelecimento_saude',
            name: 'Estabelecimentos de Saúde (CNES)',
            varName: 'GEO_DATA_estabelecimento_saude',
            badge: 'Saúde',
            geomType: 'point',
            active: false,
            style: { color: '#ffffff', fillColor: '#dc2626', radius: 7, weight: 2 },
            baseZIndex: 590
        },
        {
            id: 'nascentes',
            name: 'Nascentes Mapeadas',
            varName: 'GEO_DATA_nascentes',
            badge: 'Nascentes',
            geomType: 'point',
            active: false,
            style: { color: '#ffffff', fillColor: '#0284c7', radius: 5.5, weight: 1.8 },
            baseZIndex: 600
        }
    ];

    const layersGroup = {};
    const layersDataGroup = {};
    let layerMascaraRef = null;

    // --------------------------------------------------------------------------
    // 6. Centralização Robusta do Município de Jaguaraçu
    // --------------------------------------------------------------------------
    function fitMunicipio(animate = false) {
        if (!layerMascaraRef) return;
        map.invalidateSize();
        // Ajusta os limites visíveis garantindo que toda a fronteira do município fique visível
        map.fitBounds(layerMascaraRef.getBounds(), {
            padding: [30, 30],
            animate: animate
        });
    }

    // --------------------------------------------------------------------------
    // 7. Popups Informativos
    // --------------------------------------------------------------------------
    function buildFeaturePopup(layerCfg, feature) {
        const props = feature.properties || {};
        const title = props.Atrativo || props.NOME || props.nome || props.name || props.NM_MUN || props.cod_imovel || props.UNIDADE || props.noriocomp || props.noespecif || props.categoria || layerCfg.name;
        const color = layerCfg.style.color || '#1e3a8a';

        let rowsHTML = '';
        const ignoredKeys = new Set(['ogc_fid', 'fid_1', 'id1', 'id_objeto', 'cd_fcim']);

        for (const [key, val] of Object.entries(props)) {
            if (val !== null && val !== undefined && !ignoredKeys.has(key)) {
                let displayVal = val;
                if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
                    displayVal = `<a href="${val}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-weight: 600; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-external-link-alt" style="font-size: 0.7rem;"></i> Abrir Link</a>`;
                } else if (typeof val === 'number') {
                    if (key.includes('area') || key.includes('AREA') || key.includes('ar_poli')) {
                        displayVal = `${val.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ha`;
                    } else if (key.includes('perim') || key.includes('compr')) {
                        displayVal = `${val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km`;
                    } else {
                        displayVal = val.toLocaleString('pt-BR');
                    }
                }
                rowsHTML += `<tr><th>${key}:</th><td>${displayVal}</td></tr>`;
            }
        }

        return `
            <div class="popup-header" style="background: ${color};">
                <i class="fas fa-layer-group"></i> ${layerCfg.name}
            </div>
            <div class="popup-body">
                <h4 style="margin-bottom: 4px; font-size: 0.88rem; color: #0f172a; font-weight: 700;">${title}</h4>
                <table class="popup-table">
                    ${rowsHTML || '<tr><td colspan="2">Sem atributos adicionais registrados</td></tr>'}
                </table>
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 0.68rem; color: #475569; line-height: 1.4;">
                    <b>Fonte das informações geoespaciais:</b> INDE (Infraestrutura Nacional de Dados Espaciais), IDE-SISEMA (Sistema Estadual de Meio Ambiente e Desenvolvimento Sustentável de MG) e Prefeitura Municipal de Jaguaraçu.<br>
                    <b>Adaptação e Prototipação:</b> <a href="http://lattes.cnpq.br/2773267607623633" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-weight: 600;">Prof. Sérgio Lana</a>
                </div>
            </div>
        `;
    }

    // Função para calcular estilo de feição (suporta modo temático por atributo)
    function getFeatureStyle(cfg, feature) {
        const tCfg = THEMATIC_CONFIG[cfg.id];
        if (tCfg && tCfg.classes) {
            const classKey = tCfg.getClass(feature);
            const classStyle = tCfg.classes[classKey];
            if (classStyle) {
                return {
                    color: classStyle.color,
                    weight: cfg.style.weight || 2,
                    dashArray: cfg.style.dashArray || null,
                    opacity: cfg.style.opacity !== undefined ? cfg.style.opacity : 1,
                    fillColor: classStyle.fill,
                    fillOpacity: cfg.style.fillOpacity !== undefined ? cfg.style.fillOpacity : 0.4,
                    fill: true
                };
            }
        }

        if (cfg.customStyler) return cfg.customStyler(feature);

        return {
            color: cfg.style.color,
            weight: cfg.style.weight || 2,
            dashArray: cfg.style.dashArray || null,
            opacity: cfg.style.opacity !== undefined ? cfg.style.opacity : 1,
            fillColor: cfg.style.fillColor || cfg.style.color,
            fillOpacity: cfg.style.fillOpacity !== undefined ? cfg.style.fillOpacity : 0.35,
            fill: cfg.style.fill !== undefined ? cfg.style.fill : (cfg.geomType === 'polygon')
        };
    }

    // --------------------------------------------------------------------------
    // 8. Inicializar Camadas e Construir Controles na Sidebar
    // --------------------------------------------------------------------------
    const containerCamadas = document.getElementById('layers-list-container');

    LAYERS_CONFIG.forEach(cfg => {
        const geojsonData = window[cfg.varName];
        if (!geojsonData) {
            console.warn(`Arquivo de dados não encontrado para a camada: ${cfg.varName}`);
            return;
        }

        layersDataGroup[cfg.id] = geojsonData;

        const paneName = `${cfg.id}Pane`;
        if (!map.getPane(paneName)) {
            map.createPane(paneName);
            map.getPane(paneName).style.zIndex = cfg.baseZIndex;
        }

        const leafletLayer = L.geoJSON(geojsonData, {
            pane: paneName,
            interactive: cfg.interactive !== undefined ? cfg.interactive : true,
            style: (feature) => getFeatureStyle(cfg, feature),
            pointToLayer: (feature, latlng) => {
                if (cfg.geomType === 'point') {
                    return L.circleMarker(latlng, {
                        pane: paneName,
                        radius: cfg.style.radius || 6,
                        fillColor: cfg.style.fillColor || cfg.style.color,
                        color: cfg.style.color || '#ffffff',
                        weight: cfg.style.weight || 2,
                        opacity: cfg.style.opacity || 1,
                        fillOpacity: cfg.style.fillOpacity || 0.9
                    });
                }
            },
            onEachFeature: (feature, layer) => {
                if (cfg.interactive !== false) {
                    layer.bindPopup(buildFeaturePopup(cfg, feature));
                }
            }
        });

        layersGroup[cfg.id] = leafletLayer;
        if (cfg.id === 'mascara') {
            layerMascaraRef = leafletLayer;
        }

        // Apenas o Limite Municipal inicia adicionado ao mapa
        if (cfg.active) {
            leafletLayer.addTo(map);
        }

        // Montagem do Card da Camada
        if (containerCamadas) {
            const card = document.createElement('div');
            card.className = 'layer-card';
            card.setAttribute('draggable', 'true');
            card.setAttribute('data-layer-id', cfg.id);

            const initialOpacity = cfg.style.fillOpacity !== undefined ? cfg.style.fillOpacity : (cfg.style.opacity || 0.7);
            const strokeColor = cfg.style.color || '#3b82f6';
            const fillColor = cfg.style.fillColor || strokeColor;
            const weightVal = cfg.style.weight || 2;

            // Painel de simbologia temática customizável por classe (se houver)
            const tCfg = THEMATIC_CONFIG[cfg.id];
            let thematicHTML = '';
            if (tCfg && tCfg.classes) {
                let classItemsHTML = '';
                for (const [cKey, cInfo] of Object.entries(tCfg.classes)) {
                    classItemsHTML += `
                        <div class="class-item-row">
                            <div class="class-color-preview" style="background: ${cInfo.fill}; border-color: ${cInfo.color};" id="preview_${cfg.id}_${cKey}"></div>
                            <span class="class-item-label" title="${cInfo.label}">${cInfo.label}</span>
                            <input type="color" class="class-color-input" data-layer="${cfg.id}" data-class="${cKey}" value="${cInfo.fill}" title="Clique para alterar a cor desta classe no mapa">
                        </div>
                    `;
                }

                thematicHTML = `
                    <button type="button" class="btn-symbology-toggle" data-layer="${cfg.id}">
                        <i class="fas fa-palette"></i> Simbologia por Atributos & Legenda
                    </button>
                    <div class="classes-legend-panel" id="panel_classes_${cfg.id}" style="display: none;">
                        <div class="classes-legend-header">
                            <span><i class="fas fa-tags"></i> ${tCfg.fieldDesc}</span>
                        </div>
                        <div class="classes-legend-list">
                            ${classItemsHTML}
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="layer-header">
                    <div class="drag-handle" title="Clique e arraste para reordenar a sobreposição desta camada">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <label class="layer-title-group" style="flex: 1;">
                        <input type="checkbox" class="layer-toggle" data-layer="${cfg.id}" ${cfg.active ? 'checked' : ''}>
                        <span class="layer-name">${cfg.name}</span>
                    </label>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="layer-badge">${cfg.badge}</span>
                        <button type="button" class="btn-download-kml" data-layer="${cfg.id}" title="Baixar camada '${cfg.name}' em formato KML (Google Earth)">
                            <i class="fas fa-file-arrow-down"></i> KML
                        </button>
                    </div>
                </div>
                <div class="layer-controls">
                    <span class="opacity-label">Opacidade:</span>
                    <input type="range" class="opacity-slider" data-layer="${cfg.id}" min="0" max="1" step="0.05" value="${initialOpacity}">
                </div>
                <div class="layer-style-options">
                    <div class="style-item">
                        <span class="style-label">${cfg.geomType === 'point' ? 'Borda:' : (cfg.geomType === 'line' ? 'Linha:' : 'Contorno:')}</span>
                        <input type="color" class="color-picker-stroke" data-layer="${cfg.id}" value="${strokeColor}" title="Cor geral do contorno">
                    </div>
                    ${cfg.geomType !== 'line' ? `
                    <div class="style-item">
                        <span class="style-label">${cfg.geomType === 'point' ? 'Ponto:' : 'Fundo:'}</span>
                        <input type="color" class="color-picker-fill" data-layer="${cfg.id}" value="${fillColor}" title="Cor geral de preenchimento">
                    </div>` : ''}
                    <div class="style-item">
                        <span class="style-label">${cfg.geomType === 'point' ? 'Tamanho:' : 'Espessura:'}</span>
                        <select class="weight-selector" data-layer="${cfg.id}" title="Espessura do traço">
                            <option value="1" ${weightVal == 1 ? 'selected' : ''}>1px</option>
                            <option value="1.8" ${weightVal == 1.8 ? 'selected' : ''}>1.8px</option>
                            <option value="2.5" ${weightVal == 2.5 ? 'selected' : ''}>2.5px</option>
                            <option value="3.5" ${weightVal == 3.5 ? 'selected' : ''}>3.5px</option>
                            <option value="5" ${weightVal == 5 ? 'selected' : ''}>5px</option>
                            <option value="7" ${weightVal == 7 ? 'selected' : ''}>7px</option>
                        </select>
                    </div>
                </div>
                ${thematicHTML}
            `;
            containerCamadas.appendChild(card);
        }
    });

    // --------------------------------------------------------------------------
    // 9. Atualização Dinâmica da Aba de Legendas (Convenções Cartográficas)
    // --------------------------------------------------------------------------
    function renderDynamicLegend() {
        const legendContainer = document.getElementById('dynamic-legend-container');
        if (!legendContainer) return;

        let html = '';

        LAYERS_CONFIG.forEach(cfg => {
            const isLayerActive = map.hasLayer(layersGroup[cfg.id]);
            const statusBadge = isLayerActive 
                ? '<span style="color: #15803d; background: #dcfce7; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Ativa no Mapa</span>'
                : '<span style="color: #64748b; background: #f1f5f9; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;">Inativa</span>';

            const tCfg = THEMATIC_CONFIG[cfg.id];

            if (tCfg && tCfg.classes) {
                // Legenda com múltiplas classes temáticas
                let classRows = '';
                for (const [cKey, cInfo] of Object.entries(tCfg.classes)) {
                    classRows += `
                        <div class="legend-item" style="margin-bottom: 4px;">
                            <div class="legend-symbol" style="background: ${cInfo.fill}; border: 1.5px solid ${cInfo.color}; width: 18px; height: 18px; border-radius: 3px;"></div>
                            <span style="font-size: 0.75rem; color: #334155;">${cInfo.label}</span>
                        </div>
                    `;
                }

                html += `
                    <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><i class="fas fa-layer-group"></i> ${cfg.name}</span>
                            ${statusBadge}
                        </div>
                        <div style="padding-left: 6px;">
                            ${classRows}
                        </div>
                    </div>
                `;
            } else if (cfg.geomType === 'line') {
                // Legenda para linhas (Hidrografia, Rodovias, etc.)
                let lineDesc = cfg.name;
                if (cfg.id === 'hidrografia') {
                    html += `
                        <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                            <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span><i class="fas fa-water"></i> Rede Hidrográfica</span>
                                ${statusBadge}
                            </div>
                            <div style="padding-left: 6px;">
                                <div class="legend-item" style="margin-bottom: 4px;">
                                    <div class="legend-symbol-line" style="background: #0284c7; height: 4px; width: 22px;"></div>
                                    <span style="font-size: 0.75rem; color: #334155;">Rio Piracicaba (Drenagem Principal)</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-symbol-line" style="background: #38bdf8; height: 2px; width: 22px;"></div>
                                    <span style="font-size: 0.75rem; color: #334155;">Córregos, Cursos d'Água e Tributários</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                            <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span><i class="fas fa-route"></i> ${cfg.name}</span>
                                ${statusBadge}
                            </div>
                            <div style="padding-left: 6px;">
                                <div class="legend-item">
                                    <div class="legend-symbol-line" style="background: ${cfg.style.color}; height: ${Math.max(cfg.style.weight || 2, 2)}px; width: 22px; ${cfg.style.dashArray ? 'border-top: 2px dashed ' + cfg.style.color + '; background: none;' : ''}"></div>
                                    <span style="font-size: 0.75rem; color: #334155;">${cfg.name}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } else if (cfg.geomType === 'point') {
                // Legenda para pontos (Sede, Saúde, Nascentes)
                html += `
                    <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><i class="fas fa-location-dot"></i> ${cfg.name}</span>
                            ${statusBadge}
                        </div>
                        <div style="padding-left: 6px;">
                            <div class="legend-item">
                                <div style="width: 14px; height: 14px; border-radius: 50%; background: ${cfg.style.fillColor}; border: 2px solid ${cfg.style.color}; margin-right: 8px;"></div>
                                <span style="font-size: 0.75rem; color: #334155;">${cfg.name}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (cfg.id === 'mascara') {
                html += `
                    <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><i class="fas fa-vector-square"></i> Limite Municipal Jaguaraçu</span>
                            ${statusBadge}
                        </div>
                        <div style="padding-left: 6px;">
                            <div class="legend-item">
                                <div class="legend-symbol" style="background: transparent; border: 2.5px dashed #7e22ce; width: 20px; height: 14px;"></div>
                                <span style="font-size: 0.75rem; color: #334155;">Perímetro Territorial Oficial</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (cfg.id === 'apa') {
                html += `
                    <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><i class="fas fa-tree"></i> APA Jaguaraçu</span>
                            ${statusBadge}
                        </div>
                        <div style="padding-left: 6px;">
                            <div class="legend-item">
                                <div class="legend-symbol" style="background: rgba(34, 197, 94, 0.22); border: 2px dashed #15803d; width: 20px; height: 14px;"></div>
                                <span style="font-size: 0.75rem; color: #334155;">Área de Proteção Ambiental (Lei nº 555/98)</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        legendContainer.innerHTML = html;
    }

    renderDynamicLegend();

    // --------------------------------------------------------------------------
    // 10. Eventos de Interação com Simbologia e Camadas
    // --------------------------------------------------------------------------

    // Alternância de visibilidade da camada
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('layer-toggle')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            if (targetLayer) {
                if (e.target.checked) {
                    map.addLayer(targetLayer);
                    updateMapLayersOrder();

                    // Abrir automaticamente a "simbologia por atributos e legenda" ao habilitar a camada
                    const panel = document.getElementById(`panel_classes_${layerKey}`);
                    const btnToggle = document.querySelector(`.btn-symbology-toggle[data-layer="${layerKey}"]`);
                    if (panel) {
                        panel.style.display = 'block';
                        if (btnToggle) btnToggle.style.background = '#e2e8f0';
                    }
                } else {
                    map.removeLayer(targetLayer);
                }
                renderDynamicLegend();
            }
        }
    });

    // Abrir/fechar painel de simbologia temática da camada
    document.addEventListener('click', (e) => {
        const btnToggle = e.target.closest('.btn-symbology-toggle');
        if (btnToggle) {
            const layerId = btnToggle.getAttribute('data-layer');
            const panel = document.getElementById(`panel_classes_${layerId}`);
            if (panel) {
                const isHidden = panel.style.display === 'none';
                panel.style.display = isHidden ? 'block' : 'none';
                btnToggle.style.background = isHidden ? '#e2e8f0' : '#f1f5f9';
            }
        }
    });

    // Alteração de cor de uma classe temática específica (Modifica simbologia e legenda em tempo real)
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('class-color-input')) {
            const layerId = e.target.getAttribute('data-layer');
            const classKey = e.target.getAttribute('data-class');
            const newColor = e.target.value;

            const tCfg = THEMATIC_CONFIG[layerId];
            if (tCfg && tCfg.classes && tCfg.classes[classKey]) {
                tCfg.classes[classKey].fill = newColor;
                tCfg.classes[classKey].color = newColor;

                // Atualizar preview visual na miniatura da classe
                const preview = document.getElementById(`preview_${layerId}_${classKey}`);
                if (preview) {
                    preview.style.background = newColor;
                    preview.style.borderColor = newColor;
                }

                // Re-estilizar a camada no mapa Leaflet imediatamente
                const targetLayer = layersGroup[layerId];
                const layerCfg = LAYERS_CONFIG.find(c => c.id === layerId);
                if (targetLayer && layerCfg) {
                    targetLayer.setStyle((feat) => getFeatureStyle(layerCfg, feat));
                }

                // Atualizar a aba de legendas
                renderDynamicLegend();
            }
        }
    });

    // Ajuste geral de Opacidade
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('opacity-slider')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const val = parseFloat(e.target.value);
            if (targetLayer && targetLayer.setStyle) {
                targetLayer.setStyle({
                    fillOpacity: val,
                    opacity: Math.min(val + 0.3, 1)
                });
            }
        }
    });

    // Alteração de Cor da Linha/Contorno geral
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('color-picker-stroke')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const newColor = e.target.value;
            if (targetLayer && targetLayer.setStyle) {
                targetLayer.setStyle({ color: newColor });
            }
        }
    });

    // Alteração de Cor do Preenchimento geral
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('color-picker-fill')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const newFillColor = e.target.value;
            if (targetLayer && targetLayer.setStyle) {
                targetLayer.setStyle({ fillColor: newFillColor, fill: true });
            }
        }
    });

    // Alteração de Espessura do Traço / Raio do Ponto
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('weight-selector')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const newWeight = parseFloat(e.target.value);
            if (targetLayer && targetLayer.setStyle) {
                targetLayer.setStyle({ weight: newWeight });
            }
            if (targetLayer && targetLayer.setRadius) {
                targetLayer.setRadius(newWeight * 2.5);
            }
        }
    });

    // Download em Formato KML (.kml) ao clicar no botão
    document.addEventListener('click', (e) => {
        const btnKml = e.target.closest('.btn-download-kml');
        if (btnKml) {
            e.preventDefault();
            const layerKey = btnKml.getAttribute('data-layer');
            const geojsonData = layersDataGroup[layerKey];
            const cfg = LAYERS_CONFIG.find(c => c.id === layerKey);
            const layerName = cfg ? cfg.name : layerKey;

            if (geojsonData) {
                exportGeoJSONToKML(geojsonData, layerName);
            } else {
                alert('Dados geográficos desta camada não encontrados para download.');
            }
        }
    });

    // --------------------------------------------------------------------------
    // 11. Reordenação de Camadas por Arrasto (Drag-and-Drop)
    // --------------------------------------------------------------------------
    function initLayerReordering() {
        const listContainer = document.getElementById('layers-list-container');
        if (!listContainer) return;

        let draggedCard = null;

        listContainer.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.layer-card');
            if (card) {
                draggedCard = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        listContainer.addEventListener('dragend', (e) => {
            const card = e.target.closest('.layer-card');
            if (card) {
                card.classList.remove('dragging');
            }
            document.querySelectorAll('.layer-card').forEach(c => c.classList.remove('drag-over'));
            draggedCard = null;
            updateMapLayersOrder();
        });

        listContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const overCard = e.target.closest('.layer-card');
            if (overCard && overCard !== draggedCard) {
                document.querySelectorAll('.layer-card').forEach(c => c.classList.remove('drag-over'));
                overCard.classList.add('drag-over');

                const rect = overCard.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    listContainer.insertBefore(draggedCard, overCard);
                } else {
                    listContainer.insertBefore(draggedCard, overCard.nextSibling);
                }
            }
        });
    }

    function updateMapLayersOrder() {
        const cards = Array.from(document.querySelectorAll('.layer-card'));

        cards.forEach((card, index) => {
            const chk = card.querySelector('.layer-toggle');
            if (!chk) return;
            const layerKey = chk.getAttribute('data-layer');
            const zIndexValue = 1000 - (index * 10);

            const paneName = `${layerKey}Pane`;
            const pane = map.getPane(paneName);
            if (pane) {
                pane.style.zIndex = zIndexValue;
            }
        });

        cards.slice().reverse().forEach(card => {
            const chk = card.querySelector('.layer-toggle');
            if (!chk) return;
            const layerKey = chk.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];

            if (targetLayer && map.hasLayer(targetLayer) && targetLayer.bringToFront) {
                targetLayer.bringToFront();
            }
        });
    }

    initLayerReordering();
    updateMapLayersOrder();

    // --------------------------------------------------------------------------
    // 12. Upload Dinâmico de Arquivos GeoJSON & Drag-and-Drop no Mapa
    // --------------------------------------------------------------------------
    const btnUpload = document.getElementById('btn-upload-geojson');
    const inputUpload = document.getElementById('input-upload-geojson');

    if (btnUpload && inputUpload) {
        btnUpload.addEventListener('click', () => inputUpload.click());

        inputUpload.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => processGeoJSONFile(file));
            inputUpload.value = '';
        });
    }

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mapContainer.style.outline = '4px dashed #2563eb';
        });

        mapContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mapContainer.style.outline = '';
        });

        mapContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mapContainer.style.outline = '';

            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.geojson') || f.name.endsWith('.json'));
            if (files.length === 0) {
                alert('Por favor, solte apenas arquivos com extensão .geojson ou .json');
                return;
            }
            files.forEach(file => processGeoJSONFile(file));
        });
    }

    function processGeoJSONFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const geojsonData = JSON.parse(event.target.result);
                const layerName = file.name.replace(/\.(geojson|json)$/i, '');
                addDynamicGeoJSONLayer(layerName, geojsonData);
            } catch (err) {
                alert(`Erro ao ler o arquivo GeoJSON: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }

    const vibrantColors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
    let colorIndex = 0;

    function addDynamicGeoJSONLayer(name, geojsonData) {
        const layerKey = `dyn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const strokeColor = vibrantColors[colorIndex % vibrantColors.length];
        colorIndex++;

        layersDataGroup[layerKey] = geojsonData;

        const paneName = `${layerKey}Pane`;
        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = 700;

        const newLayer = L.geoJSON(geojsonData, {
            pane: paneName,
            style: {
                color: strokeColor,
                weight: 2.5,
                fillColor: strokeColor,
                fillOpacity: 0.4
            },
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    pane: paneName,
                    radius: 7,
                    fillColor: strokeColor,
                    color: '#ffffff',
                    weight: 2,
                    fillOpacity: 0.95
                });
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                let rowsHTML = '';
                for (let k in props) {
                    rowsHTML += `<tr><th>${k}:</th><td>${props[k]}</td></tr>`;
                }
                layer.bindPopup(`
                    <div class="popup-header" style="background: ${strokeColor};">
                        <i class="fas fa-file-circle-check"></i> ${name}
                    </div>
                    <div class="popup-body">
                        <p style="font-size: 0.7rem; color: #64748b; margin-bottom: 6px;">
                            <i class="fas fa-user-graduate"></i> Geoportal Jaguaraçu | <a href="http://lattes.cnpq.br/2773267607623633" target="_blank" style="color: #2563eb; text-decoration: none;">Prof. Sérgio Lana</a>
                        </p>
                        <table class="popup-table">
                            ${rowsHTML || '<tr><td colspan="2">Sem atributos registrados</td></tr>'}
                        </table>
                    </div>
                `);
            }
        }).addTo(map);

        layersGroup[layerKey] = newLayer;

        try {
            const bounds = newLayer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { animate: true, padding: [30, 30] });
            }
        } catch (e) {}

        if (containerCamadas) {
            const cardHTML = document.createElement('div');
            cardHTML.className = 'layer-card';
            cardHTML.setAttribute('draggable', 'true');
            cardHTML.setAttribute('data-layer-id', layerKey);
            cardHTML.innerHTML = `
                <div class="layer-header">
                    <div class="drag-handle" title="Clique e arraste para reordenar esta camada">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <label class="layer-title-group" style="flex: 1;">
                        <input type="checkbox" class="layer-toggle" data-layer="${layerKey}" checked>
                        <span class="layer-name">${name}</span>
                    </label>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="layer-badge" style="background: ${strokeColor}22; color: ${strokeColor}; border: 1px solid ${strokeColor}55;">Nova</span>
                        <button type="button" class="btn-download-kml" data-layer="${layerKey}" title="Baixar camada '${name}' em formato KML">
                            <i class="fas fa-file-arrow-down"></i> KML
                        </button>
                    </div>
                </div>
                <div class="layer-controls">
                    <span class="opacity-label">Opacidade:</span>
                    <input type="range" class="opacity-slider" data-layer="${layerKey}" min="0" max="1" step="0.05" value="0.7">
                </div>
                <div class="layer-style-options">
                    <div class="style-item">
                        <span class="style-label">Linha:</span>
                        <input type="color" class="color-picker-stroke" data-layer="${layerKey}" value="${strokeColor}">
                    </div>
                    <div class="style-item">
                        <span class="style-label">Fundo:</span>
                        <input type="color" class="color-picker-fill" data-layer="${layerKey}" value="${strokeColor}">
                    </div>
                    <div class="style-item">
                        <span class="style-label">Traço:</span>
                        <select class="weight-selector" data-layer="${layerKey}">
                            <option value="1">1px</option>
                            <option value="2.5" selected>2.5px</option>
                            <option value="4">4px</option>
                            <option value="6">6px</option>
                        </select>
                    </div>
                </div>
            `;
            containerCamadas.insertBefore(cardHTML, containerCamadas.firstChild);
            updateMapLayersOrder();
        }

        alert(`Camada "${name}" carregada com sucesso! Você também pode baixá-la em formato .KML.`);
    }

    // --------------------------------------------------------------------------
    // 13. Atualização do Dashboard de Estatísticas
    // --------------------------------------------------------------------------
    function updateDashboard() {
        if (window.GEO_DATA_area_imoveis_CAR) {
            const features = window.GEO_DATA_area_imoveis_CAR.features || [];
            const countCAR = features.length;
            const totalAreaHa = features.reduce((acc, f) => acc + (f.properties.num_area || 0), 0);

            const elCount = document.getElementById('stat-car-count');
            const elArea = document.getElementById('stat-car-area');

            if (elCount) elCount.innerText = countCAR.toLocaleString('pt-BR');
            if (elArea) elArea.innerText = `${totalAreaHa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`;
        }

        if (window.GEO_DATA_hidrografia) {
            const hydroCount = (window.GEO_DATA_hidrografia.features || []).length;
            const elHydro = document.getElementById('stat-hydro-count');
            if (elHydro) elHydro.innerText = `${hydroCount.toLocaleString('pt-BR')} trechos`;
        }
    }

    updateDashboard();

    // --------------------------------------------------------------------------
    // 14. Busca Inteligente Global no Mapa
    // --------------------------------------------------------------------------
    const searchInput = document.getElementById('input-search-map');
    const btnSearch = document.getElementById('btn-search-map');

    function performSearch() {
        const query = (searchInput.value || '').trim().toLowerCase();
        if (!query) {
            alert('Digite um termo para pesquisar (ex: código CAR, nome de rua, rio, geologia, saúde ou distrito).');
            return;
        }

        let found = false;

        for (const [layerId, layerObj] of Object.entries(layersGroup)) {
            if (found) break;

            layerObj.eachLayer((subLayer) => {
                if (found) return;
                const props = subLayer.feature ? subLayer.feature.properties : null;
                if (!props) return;

                for (const val of Object.values(props)) {
                    if (val && String(val).toLowerCase().includes(query)) {
                        if (!map.hasLayer(layerObj)) {
                            map.addLayer(layerObj);
                            const chk = document.querySelector(`.layer-toggle[data-layer="${layerId}"]`);
                            if (chk) chk.checked = true;
                            updateMapLayersOrder();
                            renderDynamicLegend();
                        }

                        if (subLayer.getBounds) {
                            map.fitBounds(subLayer.getBounds(), { maxZoom: 16, animate: true });
                        } else if (subLayer.getLatLng) {
                            map.setView(subLayer.getLatLng(), 16, { animate: true });
                        }

                        if (subLayer.openPopup) {
                            subLayer.openPopup();
                        }

                        found = true;
                        break;
                    }
                }
            });
        }

        if (!found) {
            alert(`Nenhum resultado encontrado para "${query}". Tente buscar por termos como "Piracicaba", "Centro", código do CAR ou nome de unidade.`);
        }
    }

    if (btnSearch) btnSearch.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    // --------------------------------------------------------------------------
    // 15. Controles de Interface, Centralização e Responsividade
    // --------------------------------------------------------------------------

    // Centralização inicial e no botão "Ver Município"
    const btnResetExtent = document.getElementById('btn-reset-extent');
    if (btnResetExtent) {
        btnResetExtent.addEventListener('click', () => fitMunicipio(true));
    }

    // Alternar Sidebar Retrátil com ajuste imediato do mapa
    const sidebar = document.getElementById('sidebar');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        setTimeout(() => {
            fitMunicipio(true);
        }, 320);
    }

    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', toggleSidebar);

    // Navegação por Abas na Sidebar
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetEl = document.getElementById(`tab-${targetTab}`);
            if (targetEl) targetEl.classList.add('active');

            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                setTimeout(() => fitMunicipio(true), 320);
            }

            if (targetTab === 'legenda') {
                renderDynamicLegend();
            }
        });
    });

    const btnNavColaborar = document.getElementById('btn-nav-colaborar');
    if (btnNavColaborar) {
        btnNavColaborar.addEventListener('click', () => {
            const colabTabBtn = document.querySelector('.tab-btn[data-tab="colaborar"]');
            if (colabTabBtn) colabTabBtn.click();
        });
    }

    // Inicializar Módulos Auxiliares
    if (typeof GeoCollaborationManager !== 'undefined') {
        window.colabManager = new GeoCollaborationManager(map);
    }

    if (typeof GeoMeasureManager !== 'undefined') {
        window.measureManager = new GeoMeasureManager(map);
    }

    // Executar centralização inicial automática com atraso seguro para renderização do layout
    fitMunicipio(false);
    setTimeout(() => fitMunicipio(false), 300);
    window.addEventListener('resize', () => fitMunicipio(false));
});
