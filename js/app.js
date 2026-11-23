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
                const p = feat.properties || {};
                const cd = (p.clas_domi || p.cd_leg_2 || '').toUpperCase();
                const uantr = (p.nm_uantr || '').toLowerCase();
                const leg = (p.legenda || p.legenda_2 || '').toLowerCase();
                const sup = (p.leg_sup || '').toLowerCase();
                const sec1 = (p.nm_sec1 || p.leg_sec1 || '').toLowerCase();
                const carga = (p.leg_carga || '').toLowerCase();
                const fid = p.fid;

                // 1. Pastagens e Pecuária
                if (cd === 'AP' || uantr.includes('pecu') || uantr.includes('past') || leg.includes('pecu')) return 'PASTAGEM';

                // 2. Influência Urbana e Edificações
                if (cd === 'IU' || uantr.includes('urbana') || leg.includes('urbana')) return 'URBANO';

                // 3. Corpos D'água Continentais
                if (cd === 'MAGUA' || sup.includes('água') || leg.includes('água') || leg.includes('corpo')) return 'AGUA';

                // 4. Floresta Nativa / Vegetação Secundária (Mata Atlântica / Floresta Estacional Semidecidual)
                // O polígono fid: 5 corresponde à ampla área de vegetação nativa secundária contínua e APA
                if (fid === 5 || carga.includes('vsp+ap') || sec1.includes('secund') || sec1.includes('vsp') || cd === 'F' || leg.includes('floresta')) return 'FLORESTA';

                // 5. Silvicultura / Eucaliptos (Parcelas de Reflorestamento e Cultivo Comercial)
                if (cd === 'RE' || cd === 'R' || uantr.includes('eucalipto') || uantr.includes('reflor') || leg.includes('reflorestamento')) return 'EUCALIPTO';

                return 'FLORESTA';
            },
            classes: {
                'FLORESTA': { label: 'Floresta Nativa / Veg. Secundária (F)', color: '#14532d', fill: '#16a34a' },
                'EUCALIPTO': { label: 'Silvicultura / Eucaliptos (Re)', color: '#6b21a8', fill: '#9351d3' },
                'PASTAGEM': { label: 'Pecuária / Pastagens (Ap)', color: '#ca8a04', fill: '#facc15' },
                'URBANO': { label: 'Influência Urbana / Edificações (Iu)', color: '#be123c', fill: '#f43f5e' },
                'AGUA': { label: 'Corpos D\'água Continentais (Magua)', color: '#0284c7', fill: '#38bdf8' },
                'OUTROS': { label: 'Outras Áreas Antrópicas', color: '#b45309', fill: '#d97706' }
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
                'LATOSSOLO': { label: 'Latossolo Vermelho-Amarelo', color: '#cc4400', fill: '#FF5500' },
                'ARGISSOLO': { label: 'Argissolo Vermelho', color: '#cc5200', fill: '#FF6600' },
                'CAMBISSOLO': { label: 'Cambissolo Háplico', color: '#a89679', fill: '#D7C5A5' },
                'URBANA': { label: 'Área Urbana Consolidada', color: '#475569', fill: '#94a3b8' },
                'OUTROS': { label: 'Outras Unidades Pedológicas', color: '#78350f', fill: '#a16207' }
            }
        },

        relevo_2026: {
            title: 'Relevo - macrocompartimentos',
            fieldDesc: 'Macrocompartimentos de Relevo',
            getClass: (feat) => {
                const p = feat.properties || {};
                const comp = (p.Compartime || p.compartimento || p.COMPARTIME || p.nm_unidade || '').toLowerCase();
                if (comp.includes('água') || comp.includes('agua') || comp.includes('corpo')) return 'CORPO_DAGUA';
                if (comp.includes('montanha')) return 'MONTANHAS';
                if (comp.includes('planalto')) return 'PLANALTOS';
                if (comp.includes('planície') || comp.includes('planicie')) return 'PLANICIES';
                if (comp.includes('rebaixada')) return 'SUPERFICIES_REBAIXADAS';
                if (comp.includes('tabuleiro')) return 'TABULEIROS';
                return 'PLANALTOS';
            },
            classes: {
                'CORPO_DAGUA': { label: 'Corpo d’água', color: '#93c5fd', fill: '#E6F5FF' },
                'MONTANHAS': { label: 'Montanhas', color: '#7f0000', fill: '#A80000' },
                'PLANALTOS': { label: 'Planaltos', color: '#804d00', fill: '#A87000' },
                'PLANICIES': { label: 'Planícies', color: '#d4b106', fill: '#FFFF00' },
                'SUPERFICIES_REBAIXADAS': { label: 'Superfícies rebaixadas', color: '#a89370', fill: '#D7C29E' },
                'TABULEIROS': { label: 'Tabuleiros', color: '#7c9e3b', fill: '#ABCD66' }
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
            title: 'Vulnerabilidade do Meio Físico e Suscetibilidade à Erosão',
            fieldDesc: 'Vulnerabilidade a Processos Erosivos e Movimentos de Massa (CPRM)',
            getClass: (feat) => {
                const p = feat.properties || {};
                const sigla = (p.SIGLA_UNID || '').toUpperCase();
                const nome = (p.NOME_UNIDA || '').toLowerCase();
                if (sigla.includes('A3M') || nome.includes('mantiqueira')) return 'ALTA';
                return 'MODERADA';
            },
            classes: {
                'ALTA': { label: 'Alta Vulnerabilidade / Movimentos de Massa (Complexo Mantiqueira)', color: '#b91c1c', fill: '#ef4444' },
                'MODERADA': { label: 'Média/Moderada Vulnerabilidade (Gnaisse Granítico Açucena)', color: '#c2410c', fill: '#f97316' }
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
    // 4.1. Definição Visual das Variáveis para Camadas de Pontos (Símbolos Coerentes)
    // --------------------------------------------------------------------------
    const POINT_LAYER_ICONS = {
        sede_municipal: {
            icon: 'fa-landmark',
            size: [28, 28],
            className: 'point-sede_municipal',
            color: '#9333ea',
            fillColor: '#581c87',
            desc: 'Sede Administrativa e Marco Municipal'
        },
        estabelecimento_saude: {
            icon: 'fa-plus',
            size: [24, 24],
            className: 'point-estabelecimento_saude',
            color: '#ef4444',
            fillColor: '#991b1b',
            desc: 'Unidades de Saúde e Atendimento'
        },
        nascentes: {
            icon: 'fa-droplet',
            size: [20, 20],
            className: 'point-nascentes',
            color: '#38bdf8',
            fillColor: '#0284c7',
            desc: 'Olhos d\'Água e Mananciais Hídricos'
        },
        atrativos_turisticos: {
            icon: 'fa-camera',
            size: [24, 24],
            className: 'point-atrativos_turisticos',
            color: '#f59e0b',
            fillColor: '#b45309',
            desc: 'Cachoeiras, Mirantes e Patrimônio Cultural'
        },
        escolas: {
            icon: 'fa-graduation-cap',
            size: [24, 24],
            className: 'point-escolas',
            color: '#6366f1',
            fillColor: '#3730a3',
            desc: 'Escolas e Unidades Educacionais'
        },
        propriedades_rurais: {
            icon: 'fa-tractor',
            size: [24, 24],
            className: 'point-propriedades_rurais',
            color: '#22c55e',
            fillColor: '#15803d',
            desc: 'Propriedades e Fazendas Rurais'
        }
    };

    // --------------------------------------------------------------------------
    // 5. Configuração Centralizada das 24 Camadas Geográficas
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
            style: { color: '#cc4400', weight: 1.5, fillColor: '#FF5500', fillOpacity: 0.4 },
            baseZIndex: 410
        },
        {
            id: 'relevo_2026',
            name: 'Relevo - macrocompartimentos',
            varName: 'GEO_DATA_relevo_2026',
            badge: 'Relevo',
            geomType: 'polygon',
            active: false,
            isThematic: true,
            style: { color: '#804d00', weight: 1.5, fillColor: '#A87000', fillOpacity: 0.45 },
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
            name: 'Vulnerabilidade e Suscetibilidade à Erosão',
            varName: 'GEO_DATA_erosao',
            badge: 'Vulnerabilidade',
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
            style: { color: '#fde047', fillColor: '#9333ea', radius: 8, weight: 2.5 },
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
        },
        {
            id: 'atrativos_turisticos',
            name: 'Atrativos Turísticos e Culturais',
            varName: 'GEO_DATA_atrativos_turisticos',
            badge: 'Turismo',
            geomType: 'point',
            active: false,
            style: { color: '#ffffff', fillColor: '#d97706', radius: 7, weight: 2 },
            baseZIndex: 610
        },
        {
            id: 'escolas',
            name: 'Escolas e Unidades Educacionais',
            varName: 'GEO_DATA_escolas',
            badge: 'Educação',
            geomType: 'point',
            active: false,
            style: { color: '#ffffff', fillColor: '#4f46e5', radius: 7, weight: 2 },
            baseZIndex: 620
        },
        {
            id: 'propriedades_rurais',
            name: 'Propriedades Rurais Mapeadas',
            varName: 'GEO_DATA_propriedades_rurais',
            badge: 'Fazendas',
            geomType: 'point',
            active: false,
            style: { color: '#ffffff', fillColor: '#15803d', radius: 6.5, weight: 2 },
            baseZIndex: 605
        },
        // --- Camadas da Bacia do Onça Grande & Vulnerabilidade Ambiental ---
        {
            id: 'limite_onca_grande',
            name: 'Limite da Bacia do Onça Grande',
            varName: 'GEO_DATA_limite_onca_grande',
            badge: 'Bacia',
            geomType: 'polygon',
            active: false,
            style: { color: '#b91c1c', weight: 2.8, dashArray: '6, 4', fill: false, opacity: 0.95 },
            baseZIndex: 420
        },
        {
            id: 'hidrografia_2',
            name: 'Drenagem e Rede Hidrográfica (Onça Grande)',
            varName: 'GEO_DATA_hidrografia_2',
            badge: 'Drenagem 3D',
            geomType: 'line',
            active: false,
            style: { color: '#0284c7', weight: 2.2, opacity: 0.95 },
            customStyler: (feature) => {
                const props = feature.properties || {};
                const ordem = props.ORDEM || props.NUORDEMCDA || 1;
                return {
                    color: ordem >= 3 ? '#0369a1' : (ordem === 2 ? '#0284c7' : '#38bdf8'),
                    weight: ordem >= 3 ? 3.8 : (ordem === 2 ? 2.6 : 1.8),
                    opacity: 0.95
                };
            },
            baseZIndex: 495
        },
        {
            id: 'raster_relevo_sombreado',
            name: 'Relevo Sombreado 3D (Hillshade - Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_relevo_sombreado.png',
            bounds: [
                [-19.7526389, -42.7754167],
                [-19.6059722, -42.6940278]
            ],
            tifUrl: 'TIF/relevo_sobreado.tif',
            badge: 'Relevo 3D',
            active: false,
            opacity: 0,
            baseZIndex: 370,
            legend: {
                type: 'relief',
                title: 'Relevo Sombreado 3D (Hillshade)',
                desc: 'Efeito tridimensional de iluminação solar sobre vertentes e fundos de vale da drenagem'
            }
        },
        // --- Camadas Raster: Vulnerabilidade Ambiental (Onça Grande) ---
        {
            id: 'raster_geomorfologia',
            name: 'Vulnerabilidade do Relevo e Declividade (Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_geomorfologia.png',
            bounds: [
                [-19.7524335, -42.7753389],
                [-19.6059888, -42.6941605]
            ],
            tifUrl: 'TIF/geomorfologia_certo.tif',
            badge: 'Declividade',
            active: false,
            opacity: 0.75,
            baseZIndex: 375,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade do Relevo e Declividade',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_perda_solos',
            name: 'Perda de Solos / Erosão - USLE (Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_perda_solos.png',
            bounds: [
                [-19.7526122, -42.7755802],
                [-19.6059873, -42.6940632]
            ],
            tifUrl: 'TIF/perda_solos.tif',
            badge: 'Erosão',
            active: false,
            opacity: 0.75,
            baseZIndex: 376,
            legend: {
                type: 'classes',
                title: 'Perda Estimada de Solos (t/ha.ano)',
                classes: [
                    { label: 'Muito baixa (14.0 - 16.2)', color: '#1C9440' },
                    { label: 'Baixa (16.2 - 18.4)', color: '#A7D96A' },
                    { label: 'Média (18.4 - 20.6)', color: '#FFFFC2' },
                    { label: 'Alta (20.6 - 22.8)', color: '#FCAD62' },
                    { label: 'Muito Alta (22.8 - 25.0)', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_pedologia',
            name: 'Vulnerabilidade Pedológica - Solos (Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_pedologia.png',
            bounds: [
                [-19.7524406, -42.7755252],
                [-19.6060360, -42.6942193]
            ],
            tifUrl: 'TIF/pedologia.tif',
            badge: 'Solos',
            active: false,
            opacity: 0.75,
            baseZIndex: 377,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Pedológica',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_geologia',
            name: 'Vulnerabilidade Litológica - Geologia (Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_geologia.png',
            bounds: [
                [-19.7525919, -42.7754032],
                [-19.6059203, -42.6940991]
            ],
            tifUrl: 'TIF/geologia.tif',
            badge: 'Geologia',
            active: false,
            opacity: 0.75,
            baseZIndex: 378,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Litológica',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_vegetacao',
            name: 'Vulnerabilidade da Cobertura Vegetal (Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_vegetacao.png',
            bounds: [
                [-19.7524406, -42.7755252],
                [-19.6060360, -42.6942193]
            ],
            tifUrl: 'TIF/vegetacao.tif',
            badge: 'Vegetação',
            active: false,
            opacity: 0.75,
            baseZIndex: 379,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade da Vegetação e Uso da Terra',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_clima',
            name: 'Vulnerabilidade Climática (Onça Grande)',
            type: 'raster',
            url: 'rasters/raster_clima.png',
            bounds: [
                [-19.7493808, -42.7727082],
                [-19.6094863, -42.6980979]
            ],
            tifUrl: 'TIF/clima.tif',
            badge: 'Clima',
            active: false,
            opacity: 0.75,
            baseZIndex: 374,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Climática',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média (Índice 1.5)', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        // --- Camadas da Bacia do Ribeirão da Onça (TIF_2) ---
        {
            id: 'limite_bacia_onca',
            name: 'Limite da Bacia do Ribeirão da Onça',
            varName: 'GEO_DATA_limite_bacia_onca',
            badge: 'Bacia',
            geomType: 'polygon',
            active: false,
            style: { color: '#c2410c', weight: 2.8, dashArray: '6, 4', fill: false, opacity: 0.95 },
            baseZIndex: 420
        },
        {
            id: 'hidrografia_onca',
            name: 'Drenagem e Rede Hidrográfica (Ribeirão da Onça)',
            varName: 'GEO_DATA_hidrografia_onca',
            badge: 'Drenagem 3D',
            geomType: 'line',
            active: false,
            style: { color: '#0284c7', weight: 2.2, opacity: 0.95 },
            customStyler: (feature) => {
                const props = feature.properties || {};
                const ordem = props.nuordemcda || props.nuordem || props.nustrahler || props.ORDEM || 1;
                return {
                    color: ordem >= 3 ? '#0369a1' : (ordem === 2 ? '#0284c7' : '#38bdf8'),
                    weight: ordem >= 3 ? 3.8 : (ordem === 2 ? 2.6 : 1.8),
                    opacity: 0.95
                };
            },
            baseZIndex: 495
        },
        {
            id: 'raster_onca_relevo_sombreado',
            name: 'Relevo Sombreado 3D (Hillshade - Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/relevo_sombreado.png',
            bounds: [
                [-19.8204167, -42.8179167],
                [-19.6151389, -42.7481945]
            ],
            tifUrl: 'TIF_2/relevo_sombreado.tif',
            badge: 'Relevo 3D',
            active: false,
            opacity: 0,
            baseZIndex: 370,
            legend: {
                type: 'relief',
                title: 'Relevo Sombreado 3D (Hillshade - Onça)',
                desc: 'Efeito tridimensional de iluminação sobre as vertentes da bacia do Ribeirão da Onça'
            }
        },
        {
            id: 'raster_onca_geomorfologia',
            name: 'Vulnerabilidade do Relevo e Declividade (Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/geomorfologia.png',
            bounds: [
                [-19.8203968, -42.8179508],
                [-19.6151584, -42.7483693]
            ],
            tifUrl: 'TIF_2/geomorfologia.tif',
            badge: 'Declividade',
            active: false,
            opacity: 0.75,
            baseZIndex: 375,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade do Relevo e Declividade',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_onca_perda_solos',
            name: 'Perda de Solos / Erosão - USLE (Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/perda_solos.png',
            bounds: [
                [-19.8203666, -42.8179267],
                [-19.6152506, -42.7483197]
            ],
            tifUrl: 'TIF_2/perda_solos.tif',
            badge: 'Erosão',
            active: false,
            opacity: 0.75,
            baseZIndex: 376,
            legend: {
                type: 'classes',
                title: 'Perda Estimada de Solos (t/ha.ano)',
                classes: [
                    { label: 'Muito baixa (15.0 - 16.8)', color: '#1C9440' },
                    { label: 'Baixa (16.8 - 18.6)', color: '#A7D96A' },
                    { label: 'Média (18.6 - 20.4)', color: '#FFFFC2' },
                    { label: 'Alta (20.4 - 22.2)', color: '#FCAD62' },
                    { label: 'Muito Alta (22.2 - 24.0)', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_onca_pedologia',
            name: 'Vulnerabilidade Pedológica - Solos (Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/pedologia.png',
            bounds: [
                [-19.8205106, -42.8179339],
                [-19.6152201, -42.7482432]
            ],
            tifUrl: 'TIF_2/pedologia.tif',
            badge: 'Solos',
            active: false,
            opacity: 0.75,
            baseZIndex: 377,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Pedológica',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_onca_geologia',
            name: 'Vulnerabilidade Litológica - Geologia (Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/geologia.png',
            bounds: [
                [-19.8203904, -42.8178110],
                [-19.6151041, -42.7481218]
            ],
            tifUrl: 'TIF_2/geologia.tif',
            badge: 'Geologia',
            active: false,
            opacity: 0.75,
            baseZIndex: 378,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Litológica',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_onca_vegetacao',
            name: 'Vulnerabilidade da Cobertura Vegetal (Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/vegetacao.png',
            bounds: [
                [-19.8205106, -42.8179339],
                [-19.6152201, -42.7482432]
            ],
            tifUrl: 'TIF_2/vegetacao.tif',
            badge: 'Vegetação',
            active: false,
            opacity: 0.75,
            baseZIndex: 379,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade da Vegetação e Uso da Terra',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
        {
            id: 'raster_onca_clima',
            name: 'Vulnerabilidade Climática (Ribeirão da Onça)',
            type: 'raster',
            url: 'rasters_onca/clima.png',
            bounds: [
                [-19.8193280, -42.8146766],
                [-19.6188126, -42.7493925]
            ],
            tifUrl: 'TIF_2/clima.tif',
            badge: 'Clima',
            active: false,
            opacity: 0.75,
            baseZIndex: 374,
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Climática',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa', color: '#A7D96A' },
                    { label: 'Média (Índice 1.5)', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        },
            legend: {
                type: 'classes',
                title: 'Vulnerabilidade Climática Regional',
                classes: [
                    { label: 'Muito baixa', color: '#1C9440' },
                    { label: 'Baixa (1.5)', color: '#A7D96A' },
                    { label: 'Média', color: '#FFFFC2' },
                    { label: 'Alta', color: '#FCAD62' },
                    { label: 'Muito Alta', color: '#D41919' }
                ]
            }
        }
    ];

    const layersGroup = {};
    const layersDataGroup = {};
    let layerMascaraRef = null;

    // --------------------------------------------------------------------------
    // 6. Centralização Robusta do Município de Jaguaraçu (Compensa o Painel de Controle)
    // --------------------------------------------------------------------------
    function fitMunicipio(animate = false) {
        if (!layerMascaraRef) return;
        map.invalidateSize();

        const sidebarEl = document.getElementById('sidebar');
        const isMobileOrTablet = window.innerWidth <= 850;
        const isSidebarVisibleOnDesktop = sidebarEl && !sidebarEl.classList.contains('collapsed') && !isMobileOrTablet;
        const sidebarWidth = isSidebarVisibleOnDesktop ? (sidebarEl.offsetWidth || 380) : 0;

        // Compensa a largura do painel lateral para que o município fique perfeitamente centralizado na área visível
        const leftPad = isSidebarVisibleOnDesktop ? (sidebarWidth + 40) : (isMobileOrTablet ? 20 : 40);
        const rightPad = isMobileOrTablet ? 20 : 40;
        const topPad = isMobileOrTablet ? 55 : 35;
        const bottomPad = isMobileOrTablet ? 30 : 50;

        map.fitBounds(layerMascaraRef.getBounds(), {
            paddingTopLeft: [leftPad, topPad],
            paddingBottomRight: [rightPad, bottomPad],
            animate: animate,
            maxZoom: 14
        });
    }

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    // 7. Inspetor de Atributos e Destaque da Feição Selecionada (Substitui o Popup Bloqueante)
    // --------------------------------------------------------------------------
    let currentHighlightLayer = null;
    let selectedFeatureLayer = null;

    const featureInspector = document.getElementById('feature-inspector');
    const inspectorLayerBadge = document.getElementById('inspector-layer-badge');
    const inspectorLayerName = document.getElementById('inspector-layer-name');
    const inspectorFeatureTitle = document.getElementById('inspector-feature-title');
    const inspectorTable = document.getElementById('inspector-table');
    const inspectorHeader = document.getElementById('inspector-header');
    const btnInspectorClose = document.getElementById('btn-inspector-close');
    const btnInspectorZoom = document.getElementById('btn-inspector-zoom');
    const btnInspectorMinimize = document.getElementById('btn-inspector-minimize');

    function highlightFeature(layer, feature) {
        if (currentHighlightLayer) {
            map.removeLayer(currentHighlightLayer);
            currentHighlightLayer = null;
        }

        if (!feature) return;

        const geomType = feature.geometry ? feature.geometry.type : '';
        if (geomType.includes('Point')) {
            const coords = feature.geometry.coordinates;
            currentHighlightLayer = L.circleMarker([coords[1], coords[0]], {
                radius: 13,
                color: '#fbbf24',
                weight: 4,
                fillColor: '#f59e0b',
                fillOpacity: 0.5,
                pane: 'markerPane'
            }).addTo(map);
        } else {
            currentHighlightLayer = L.geoJSON(feature, {
                style: {
                    color: '#fbbf24',
                    weight: 5,
                    dashArray: null,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.25
                }
            }).addTo(map);
        }
    }

    function openFeatureInspector(layerCfg, feature, layer) {
        if (!featureInspector) return;

        selectedFeatureLayer = layer;
        highlightFeature(layer, feature);

        const props = feature.properties || {};
        const title = props.Atrativo || props.NOME || props.nome || props.name || props.NM_MUN || props.cod_imovel || props.UNIDADE || props.noriocomp || props.noespecif || props.categoria || layerCfg.name;
        const color = layerCfg.style && layerCfg.style.color ? layerCfg.style.color : '#1e3a8a';

        if (inspectorHeader) {
            inspectorHeader.style.background = `linear-gradient(135deg, ${color} 0%, #0f172a 100%)`;
        }
        if (inspectorLayerBadge) inspectorLayerBadge.innerText = layerCfg.badge || 'Camada';
        if (inspectorLayerName) inspectorLayerName.innerText = layerCfg.name;
        if (inspectorFeatureTitle) inspectorFeatureTitle.innerText = title;

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

        if (inspectorTable) {
            inspectorTable.innerHTML = rowsHTML || '<tr><td colspan="2">Sem atributos adicionais registrados</td></tr>';
        }

        featureInspector.classList.remove('minimized');
        featureInspector.classList.add('active');

        if (btnInspectorMinimize) {
            btnInspectorMinimize.innerHTML = '<i class="fas fa-chevron-down"></i>';
            btnInspectorMinimize.title = 'Minimizar painel';
        }
    }

    function closeFeatureInspector() {
        if (!featureInspector) return;
        featureInspector.classList.remove('active');
        featureInspector.classList.remove('minimized');
        if (currentHighlightLayer) {
            map.removeLayer(currentHighlightLayer);
            currentHighlightLayer = null;
        }
        selectedFeatureLayer = null;
    }

    if (btnInspectorClose) btnInspectorClose.addEventListener('click', closeFeatureInspector);

    if (btnInspectorZoom) {
        btnInspectorZoom.addEventListener('click', () => {
            if (!selectedFeatureLayer) return;
            if (selectedFeatureLayer.getBounds) {
                map.fitBounds(selectedFeatureLayer.getBounds(), { maxZoom: 16, animate: true, padding: [40, 40] });
            } else if (selectedFeatureLayer.getLatLng) {
                map.setView(selectedFeatureLayer.getLatLng(), 16, { animate: true });
            }
        });
    }

    if (btnInspectorMinimize) {
        btnInspectorMinimize.addEventListener('click', () => {
            if (!featureInspector) return;
            const isMin = featureInspector.classList.toggle('minimized');
            btnInspectorMinimize.innerHTML = isMin ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
            btnInspectorMinimize.title = isMin ? 'Expandir painel' : 'Minimizar painel';
        });
    }

    // Fechar inspetor ao clicar fora no mapa
    map.on('click', () => {
        closeFeatureInspector();
    });

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
    // 8. Inicializar Camadas e Construir Grupos Temáticos na Sidebar
    // --------------------------------------------------------------------------
    const containerCamadas = document.getElementById('layers-list-container');

    // 5 Categorias Temáticas Solicitadas
    const LAYER_CATEGORIES = [
        {
            id: 'divisao_politico_administrativa',
            name: 'Divisão Político-Administrativa',
            icon: 'fa-landmark-flag',
            color: '#4f46e5',
            bgLight: '#eef2ff',
            border: '#a5b4fc',
            layers: ['mascara', 'distritos', 'setores_censitarios', 'sede_municipal']
        },
        {
            id: 'meio_ambiente_recursos_hidricos',
            name: 'Meio Ambiente e Recursos Hídricos',
            icon: 'fa-leaf',
            color: '#059669',
            bgLight: '#ecfdf5',
            border: '#6ee7b7',
            layers: [
                'apa',
                'areas_prioritarias_conservacao',
                'vegetacao',
                'car',
                'circunscricoes_hidrograficas',
                'hidrografia',
                'nascentes',
                'geologia',
                'relevo_2026',
                'pedologia',
                'erosao'
            ]
        },
        {
            id: 'vulnerabilidade_ambiental',
            name: 'Vulnerabilidade Ambiental',
            icon: 'fa-shield-halved',
            color: '#b91c1c',
            bgLight: '#fef2f2',
            border: '#f87171',
            subcategories: [
                {
                    title: 'Bacia do Ribeirão Onça Grande',
                    subtitle: 'Estudo publicado na Revista Cerrados (Morais et al., 2026)',
                    articleCard: true,
                    layers: [
                        'limite_onca_grande',
                        'hidrografia_2',
                        'raster_relevo_sombreado',
                        'raster_geomorfologia',
                        'raster_perda_solos',
                        'raster_pedologia',
                        'raster_geologia',
                        'raster_vegetacao',
                        'raster_clima'
                    ]
                },
                {
                    title: 'Bacia do Ribeirão da Onça',
                    subtitle: 'Modelagem ecodinâmica e análise ambiental da sub-bacia',
                    articleCard: false,
                    layers: [
                        'limite_bacia_onca',
                        'hidrografia_onca',
                        'raster_onca_relevo_sombreado',
                        'raster_onca_geomorfologia',
                        'raster_onca_perda_solos',
                        'raster_onca_pedologia',
                        'raster_onca_geologia',
                        'raster_onca_vegetacao',
                        'raster_onca_clima'
                    ]
                }
            ],
            layers: [
                'limite_onca_grande',
                'hidrografia_2',
                'raster_relevo_sombreado',
                'raster_geomorfologia',
                'raster_perda_solos',
                'raster_pedologia',
                'raster_geologia',
                'raster_vegetacao',
                'raster_clima',
                'limite_bacia_onca',
                'hidrografia_onca',
                'raster_onca_relevo_sombreado',
                'raster_onca_geomorfologia',
                'raster_onca_perda_solos',
                'raster_onca_pedologia',
                'raster_onca_geologia',
                'raster_onca_vegetacao',
                'raster_onca_clima'
            ]
        },
        {
            id: 'infraestrutura_transporte',
            name: 'Infraestrutura e Transporte',
            icon: 'fa-road',
            color: '#d97706',
            bgLight: '#fffbeb',
            border: '#fcd34d',
            layers: ['rodovia_federal', 'rodovias', 'estradas_municipais', 'faces_logradouros']
        },
        {
            id: 'turismo',
            name: 'Turismo',
            icon: 'fa-camera-retro',
            color: '#e11d48',
            bgLight: '#fff1f2',
            border: '#fda4af',
            layers: ['atrativos_turisticos', 'cicloturismo']
        },
        {
            id: 'equipamentos_servicos_publicos',
            name: 'Equipamentos Urbanos e Serviços Públicos',
            icon: 'fa-hospital-user',
            color: '#0284c7',
            bgLight: '#f0f9ff',
            border: '#7dd3fc',
            layers: ['estabelecimento_saude', 'escolas', 'propriedades_rurais']
        }
    ];

    // Criar instâncias do Leaflet para cada camada
    LAYERS_CONFIG.forEach(cfg => {
        // Suporte a camadas Raster (GeoTIFF / ImageOverlay)
        if (cfg.type === 'raster') {
            const paneName = `${cfg.id}Pane`;
            if (!map.getPane(paneName)) {
                map.createPane(paneName);
                map.getPane(paneName).style.zIndex = cfg.baseZIndex || 375;
            }

            const rasterLayer = L.imageOverlay(cfg.url, cfg.bounds, {
                pane: paneName,
                opacity: cfg.opacity !== undefined ? cfg.opacity : 0.75,
                interactive: true
            });

            layersGroup[cfg.id] = rasterLayer;
            if (cfg.active) {
                rasterLayer.addTo(map);
            }
            return;
        }

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
                    const iconDef = POINT_LAYER_ICONS[cfg.id] || {
                        icon: 'fa-location-dot',
                        size: [24, 24],
                        className: 'point-default'
                    };
                    const sz = iconDef.size || [24, 24];
                    const customIcon = L.divIcon({
                        className: `gis-point-marker ${iconDef.className || ''}`,
                        html: `<i class="fas ${iconDef.icon}"></i>`,
                        iconSize: sz,
                        iconAnchor: [sz[0] / 2, sz[1] / 2],
                        popupAnchor: [0, -sz[1] / 2]
                    });
                    return L.marker(latlng, {
                        pane: paneName,
                        icon: customIcon
                    });
                }
            },
            onEachFeature: (feature, layer) => {
                if (cfg.interactive !== false) {
                    layer.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        openFeatureInspector(cfg, feature, layer);
                    });
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
    });

    // Função para criar o card de controle de uma camada
    function buildLayerCardElement(cfg) {
        const card = document.createElement('div');
        card.className = 'layer-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-layer-id', cfg.id);

        // Renderização para camadas Raster
        if (cfg.type === 'raster') {
            const initialOpacity = cfg.opacity !== undefined ? cfg.opacity : 0.75;
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
                        <span class="layer-badge" style="background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;"><i class="fas fa-image"></i> Raster</span>
                        ${cfg.tifUrl ? `
                        <a href="${cfg.tifUrl}" download class="btn-download-kml" style="text-decoration: none;" title="Baixar arquivo GeoTIFF (.tif) original">
                            <i class="fas fa-file-arrow-down"></i> TIF
                        </a>` : ''}
                    </div>
                </div>
                <div class="layer-controls">
                    <span class="opacity-label">Opacidade:</span>
                    <input type="range" class="opacity-slider" data-layer="${cfg.id}" min="0" max="1" step="0.05" value="${initialOpacity}">
                </div>
                ${cfg.legend ? (
                    cfg.legend.type === 'classes' ? `
                    <div style="margin-top: 6px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 0.68rem; font-weight: 600; color: #475569; margin-bottom: 5px;">
                            ${cfg.legend.title}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; margin-bottom: 4px;">
                            ${cfg.legend.classes.map(c => `
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                    <div style="width: 100%; height: 8px; border-radius: 2px; background: ${c.color}; border: 1px solid rgba(0,0,0,0.15);" title="${c.label}"></div>
                                    <span style="font-size: 0.58rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: center;">${c.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>` : (
                    cfg.legend.type === 'relief' ? `
                    <div style="margin-top: 6px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 0.68rem; font-weight: 600; color: #475569; margin-bottom: 2px;">
                            <i class="fas fa-mountain-sun" style="color: #64748b;"></i> ${cfg.legend.title}
                        </div>
                        <div style="font-size: 0.62rem; color: #64748b; line-height: 1.2;">
                            ${cfg.legend.desc || 'Modelo de relevo sombreado 3D'}
                        </div>
                    </div>` : `
                    <div style="margin-top: 6px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 0.68rem; font-weight: 600; color: #475569; margin-bottom: 3px;">
                            ${cfg.legend.title}
                        </div>
                        <div style="height: 10px; border-radius: 3px; background: ${cfg.legend.gradient}; border: 1px solid #cbd5e1;"></div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #64748b; margin-top: 2px;">
                            <span>${cfg.legend.min}</span>
                            <span>${cfg.legend.max}</span>
                        </div>
                    </div>`
                    )
                ) : ''}
            `;
            return card;
        }

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
        return card;
    }

    // Renderizar os grupos acordeão com suas respectivas camadas
    if (containerCamadas) {
        containerCamadas.innerHTML = '';

        LAYER_CATEGORIES.forEach(cat => {
            const groupEl = document.createElement('div');
            groupEl.className = 'layer-category-group';
            groupEl.setAttribute('data-category-id', cat.id);
            groupEl.style.borderLeft = `5px solid ${cat.color}`;

            const headerEl = document.createElement('div');
            headerEl.className = 'category-header';
            headerEl.style.background = `linear-gradient(to right, ${cat.bgLight} 0%, #ffffff 100%)`;
            headerEl.innerHTML = `
                <div class="category-header-title">
                    <span class="category-icon" style="background: ${cat.color}; box-shadow: 0 2px 6px ${cat.color}55;">
                        <i class="fas ${cat.icon}"></i>
                    </span>
                    <span class="category-name" style="color: #0f172a; font-weight: 700;">${cat.name}</span>
                    <span class="category-count">${cat.layers.length}</span>
                    <span class="category-active-badge" id="cat-badge-${cat.id}" style="display: none; background: ${cat.bgLight}; color: ${cat.color}; border: 1px solid ${cat.border};">0 ativas</span>
                </div>
                <i class="fas fa-chevron-down category-arrow" style="color: ${cat.color};"></i>
            `;

            const contentEl = document.createElement('div');
            contentEl.className = 'category-content';

            if (cat.subcategories && cat.subcategories.length > 0) {
                cat.subcategories.forEach(sub => {
                    const subGroup = document.createElement('div');
                    subGroup.className = 'layer-subcategory-group';
                    subGroup.style.marginBottom = '12px';
                    subGroup.style.padding = '8px 10px';
                    subGroup.style.background = '#ffffff';
                    subGroup.style.border = '1px solid #f1f5f9';
                    subGroup.style.borderRadius = '8px';
                    subGroup.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';

                    const subHeader = document.createElement('div');
                    subHeader.style.display = 'flex';
                    subHeader.style.alignItems = 'center';
                    subHeader.style.justifyContent = 'space-between';
                    subHeader.style.marginBottom = '8px';
                    subHeader.style.paddingBottom = '4px';
                    subHeader.style.borderBottom = '1.5px solid #fecaca';

                    subHeader.innerHTML = `
                        <div>
                            <span style="font-size: 0.76rem; font-weight: 700; color: #991b1b; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-water" style="color: #b91c1c;"></i> ${sub.title}
                            </span>
                            ${sub.subtitle ? `<span style="font-size: 0.65rem; color: #64748b;">${sub.subtitle}</span>` : ''}
                        </div>
                    `;
                    subGroup.appendChild(subHeader);

                    if (sub.articleCard) {
                        const articleCard = document.createElement('div');
                        articleCard.className = 'category-article-card';
                        articleCard.innerHTML = `
                            <div class="category-article-card-header">
                                <span class="category-article-tag">
                                    <i class="fas fa-certificate"></i> Artigo Publicado
                                </span>
                                <span style="font-size: 0.65rem; color: #991b1b; font-weight: 600;">Revista Cerrados 2026</span>
                            </div>
                            <div class="category-article-card-title">
                                Vulnerabilidade ambiental à perda de solos na bacia do ribeirão Onça Grande
                            </div>
                            <div style="font-size: 0.66rem; color: #64748b;">
                                <b>Autores:</b> Sérgio Lana Morais, Dirley dos Santos Vaz e Gilmar Vitalino Dias
                            </div>
                            <div class="category-article-actions">
                                <button type="button" class="btn-category-article primary" id="btn-open-article-info" title="Ver detalhes metodológicos e resultados">
                                    <i class="fas fa-circle-info"></i> Metodologia & Estudo
                                </button>
                                <a href="https://www.periodicos.unimontes.br/cerrados/article/view/10592" target="_blank" rel="noopener noreferrer" class="btn-category-article secondary" title="Abrir artigo na Revista Cerrados">
                                    <i class="fas fa-file-pdf"></i> Artigo / PDF
                                </a>
                            </div>
                        `;
                        subGroup.appendChild(articleCard);
                    }

                    sub.layers.forEach(layerId => {
                        const cfg = LAYERS_CONFIG.find(c => c.id === layerId);
                        if (cfg) {
                            const card = buildLayerCardElement(cfg);
                            subGroup.appendChild(card);
                        }
                    });

                    contentEl.appendChild(subGroup);
                });
            } else {
                cat.layers.forEach(layerId => {
                    const cfg = LAYERS_CONFIG.find(c => c.id === layerId);
                    if (cfg) {
                        const card = buildLayerCardElement(cfg);
                        contentEl.appendChild(card);
                    }
                });
            }

            // Toggle acordeão ao clicar no cabeçalho
            headerEl.addEventListener('click', () => {
                groupEl.classList.toggle('collapsed');
            });

            groupEl.appendChild(headerEl);
            groupEl.appendChild(contentEl);
            containerCamadas.appendChild(groupEl);
        });

        // Botões da Barra de Ferramentas: Expandir e Recolher Todos
        const btnExpandAll = document.getElementById('btn-expand-all-categories');
        const btnCollapseAll = document.getElementById('btn-collapse-all-categories');

        if (btnExpandAll) {
            btnExpandAll.addEventListener('click', () => {
                document.querySelectorAll('.layer-category-group').forEach(g => g.classList.remove('collapsed'));
            });
        }
        if (btnCollapseAll) {
            btnCollapseAll.addEventListener('click', () => {
                document.querySelectorAll('.layer-category-group').forEach(g => g.classList.add('collapsed'));
            });
        }
    }

    // Atualizar badges com contagem de camadas ativas e total em cada categoria
    function updateCategoryBadges() {
        document.querySelectorAll('.layer-category-group').forEach(group => {
            const catId = group.getAttribute('data-category-id');
            const badge = document.getElementById(`cat-badge-${catId}`);
            const countEl = group.querySelector('.category-count');
            const cards = group.querySelectorAll('.layer-card');

            if (countEl) {
                countEl.textContent = cards.length;
            }

            let activeCount = 0;
            cards.forEach(card => {
                const chk = card.querySelector('.layer-toggle');
                if (chk && chk.checked) activeCount++;
            });

            if (badge) {
                if (activeCount > 0) {
                    badge.innerText = `${activeCount} ativa${activeCount > 1 ? 's' : ''}`;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
    }

    updateCategoryBadges();

    // --------------------------------------------------------------------------
    // 9. Atualização Dinâmica da Aba de Legendas (Convenções Cartográficas)
    // --------------------------------------------------------------------------
    function renderDynamicLegend() {
        const legendContainer = document.getElementById('dynamic-legend-container');
        if (!legendContainer) return;

        let html = '';

        LAYERS_CONFIG.forEach(cfg => {
            const isLayerActive = map.hasLayer(layersGroup[cfg.id]);
            // Quando a camada está desabilitada, sua legenda correspondente também é ocultada
            if (!isLayerActive) return;

            const statusBadge = '<span style="color: #15803d; background: #dcfce7; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Ativa</span>';

            // Legenda para Camadas Raster (Vulnerabilidade Ambiental em 5 Classes ou Relevo Sombreado)
            if (cfg.type === 'raster' && cfg.legend) {
                let contentHtml = '';
                if (cfg.legend.type === 'classes') {
                    let classItems = '';
                    cfg.legend.classes.forEach(c => {
                        classItems += `
                            <div class="legend-item" style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                                <div class="legend-symbol" style="background: ${c.color}; border: 1px solid rgba(0,0,0,0.2); width: 18px; height: 18px; border-radius: 3px; flex-shrink: 0;"></div>
                                <span style="font-size: 0.74rem; color: #334155; font-weight: 500;">${c.label}</span>
                            </div>
                        `;
                    });
                    contentHtml = `
                        <div style="font-size: 0.73rem; font-weight: 600; color: #475569; margin-bottom: 6px;">
                            ${cfg.legend.title}
                        </div>
                        <div style="padding-left: 2px;">
                            ${classItems}
                        </div>
                        <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 6px;">
                            <i class="fas fa-file-image"></i> Formato: GeoTIFF (.tif) categorizado
                        </div>
                    `;
                } else if (cfg.legend.type === 'relief') {
                    contentHtml = `
                        <div style="font-size: 0.73rem; font-weight: 600; color: #475569; margin-bottom: 4px;">
                            <i class="fas fa-mountain-sun" style="color: #64748b;"></i> ${cfg.legend.title}
                        </div>
                        <div style="font-size: 0.70rem; color: #64748b; line-height: 1.3;">
                            ${cfg.legend.desc || 'Modelo de relevo sombreado 3D de alta precisão.'}
                        </div>
                        <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 6px;">
                            <i class="fas fa-cube"></i> Modelo Digital de Terreno (MDT / Hillshade)
                        </div>
                    `;
                } else {
                    contentHtml = `
                        <div style="font-size: 0.73rem; font-weight: 600; color: #475569; margin-bottom: 4px;">
                            ${cfg.legend.title}
                        </div>
                        <div style="height: 14px; border-radius: 4px; background: ${cfg.legend.gradient}; border: 1px solid #cbd5e1; margin-bottom: 4px;"></div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: #64748b; font-weight: 600;">
                            <span>${cfg.legend.min}</span>
                            <span>${cfg.legend.max}</span>
                        </div>
                        <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 4px;">
                            <i class="fas fa-file-image"></i> Formato: GeoTIFF (.tif)
                        </div>
                    `;
                }

                html += `
                    <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><i class="fas fa-image" style="color: #b91c1c;"></i> ${cfg.name}</span>
                            ${statusBadge}
                        </div>
                        <div style="padding-left: 6px;">
                            ${contentHtml}
                        </div>
                    </div>
                `;
                return;
            }

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
                // Legenda diferenciada para pontos com ícones temáticos
                const iconDef = POINT_LAYER_ICONS[cfg.id] || {
                    icon: 'fa-location-dot',
                    className: 'point-default',
                    color: cfg.style.color || '#ffffff',
                    fillColor: cfg.style.fillColor || '#2563eb',
                    desc: cfg.name
                };

                html += `
                    <div class="legend-section" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div class="legend-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><i class="fas fa-location-dot"></i> ${cfg.name}</span>
                            ${statusBadge}
                        </div>
                        <div style="padding-left: 6px;">
                            <div class="legend-item" style="display: flex; align-items: center; gap: 8px;">
                                <div class="gis-point-marker ${iconDef.className}" style="width: 24px; height: 24px; font-size: 11px; flex-shrink: 0; box-shadow: none;">
                                    <i class="fas ${iconDef.icon}"></i>
                                </div>
                                <div>
                                    <div style="font-size: 0.78rem; font-weight: 600; color: #1e293b;">${cfg.name}</div>
                                    <div style="font-size: 0.7rem; color: #64748b;">${iconDef.desc || ''}</div>
                                </div>
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

        if (html === '') {
            legendContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 30px 15px; font-size: 0.85rem;">
                    <i class="fas fa-layer-group" style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.35;"></i><br>
                    <b>Nenhuma camada temática ativa no momento.</b><br>
                    <span style="font-size: 0.75rem; color: #64748b; display: block; margin-top: 6px;">
                        Ative uma camada na aba <b>Camadas</b> para visualizar sua convenção cartográfica e legenda correspondente aqui.
                    </span>
                </div>
            `;
            return;
        }

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
                    // Fechar/desabilitar a legenda da camada desativada
                    const panel = document.getElementById(`panel_classes_${layerKey}`);
                    const btnToggle = document.querySelector(`.btn-symbology-toggle[data-layer="${layerKey}"]`);
                    if (panel) {
                        panel.style.display = 'none';
                        if (btnToggle) btnToggle.style.background = '#f1f5f9';
                    }
                }

                // Sincronização automática da camada de Relevo Sombreado 3D (Hillshade):
                // Bacia do Onça Grande
                const triggerLayersOncaGrande = [
                    'raster_geomorfologia',
                    'raster_perda_solos',
                    'raster_pedologia',
                    'raster_geologia',
                    'raster_vegetacao'
                ];

                if (triggerLayersOncaGrande.includes(layerKey)) {
                    const hillshadeLayer = layersGroup['raster_relevo_sombreado'];
                    const hillshadeChk = document.querySelector('.layer-toggle[data-layer="raster_relevo_sombreado"]');

                    if (hillshadeLayer) {
                        const hasAnyTriggerActive = triggerLayersOncaGrande.some(id => {
                            const chk = document.querySelector(`.layer-toggle[data-layer="${id}"]`);
                            return chk && chk.checked;
                        });

                        if (hasAnyTriggerActive) {
                            if (!map.hasLayer(hillshadeLayer)) {
                                map.addLayer(hillshadeLayer);
                            }
                            if (hillshadeChk) hillshadeChk.checked = true;
                        } else {
                            if (map.hasLayer(hillshadeLayer)) {
                                map.removeLayer(hillshadeLayer);
                            }
                            if (hillshadeChk) hillshadeChk.checked = false;
                        }
                    }
                }

                // Bacia do Ribeirão da Onça
                const triggerLayersOnca = [
                    'raster_onca_geomorfologia',
                    'raster_onca_perda_solos',
                    'raster_onca_pedologia',
                    'raster_onca_geologia',
                    'raster_onca_vegetacao'
                ];

                if (triggerLayersOnca.includes(layerKey)) {
                    const hillshadeLayerOnca = layersGroup['raster_onca_relevo_sombreado'];
                    const hillshadeChkOnca = document.querySelector('.layer-toggle[data-layer="raster_onca_relevo_sombreado"]');

                    if (hillshadeLayerOnca) {
                        const hasAnyTriggerActive = triggerLayersOnca.some(id => {
                            const chk = document.querySelector(`.layer-toggle[data-layer="${id}"]`);
                            return chk && chk.checked;
                        });

                        if (hasAnyTriggerActive) {
                            if (!map.hasLayer(hillshadeLayerOnca)) {
                                map.addLayer(hillshadeLayerOnca);
                            }
                            if (hillshadeChkOnca) hillshadeChkOnca.checked = true;
                        } else {
                            if (map.hasLayer(hillshadeLayerOnca)) {
                                map.removeLayer(hillshadeLayerOnca);
                            }
                            if (hillshadeChkOnca) hillshadeChkOnca.checked = false;
                        }
                    }
                }

                renderDynamicLegend();
                updateCategoryBadges();
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
            if (targetLayer) {
                // Suporte para ImageOverlay (Raster)
                if (targetLayer.setOpacity) {
                    targetLayer.setOpacity(val);
                }
                // Suporte para GeoJSON vetorial
                if (targetLayer.setStyle) {
                    targetLayer.setStyle({
                        fillOpacity: val,
                        opacity: Math.min(val + 0.3, 1)
                    });
                }
                if (targetLayer.eachLayer) {
                    targetLayer.eachLayer(l => {
                        if (l._icon) l._icon.style.opacity = val;
                    });
                }
            }
        }
    });

    // Alteração de Cor da Linha/Contorno geral
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('color-picker-stroke')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const newColor = e.target.value;
            if (targetLayer) {
                if (targetLayer.setStyle) targetLayer.setStyle({ color: newColor });
                targetLayer.eachLayer(l => {
                    if (l._icon) l._icon.style.borderColor = newColor;
                });
            }
        }
    });

    // Alteração de Cor do Preenchimento geral
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('color-picker-fill')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const newFillColor = e.target.value;
            if (targetLayer) {
                if (targetLayer.setStyle) targetLayer.setStyle({ fillColor: newFillColor, fill: true });
                targetLayer.eachLayer(l => {
                    if (l._icon) l._icon.style.background = newFillColor;
                });
            }
        }
    });

    // Alteração de Espessura do Traço / Raio do Ponto
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('weight-selector')) {
            const layerKey = e.target.getAttribute('data-layer');
            const targetLayer = layersGroup[layerKey];
            const newWeight = parseFloat(e.target.value);
            if (targetLayer) {
                if (targetLayer.setStyle) targetLayer.setStyle({ weight: newWeight });
                if (targetLayer.setRadius) targetLayer.setRadius(newWeight * 2.5);
                targetLayer.eachLayer(l => {
                    if (l._icon) {
                        const newSize = Math.max(16, Math.round(newWeight * 6));
                        l._icon.style.width = `${newSize}px`;
                        l._icon.style.height = `${newSize}px`;
                        l._icon.style.fontSize = `${Math.max(9, Math.round(newSize * 0.45))}px`;
                    }
                });
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
    // 11. Reordenação de Camadas por Arrasto (Drag-and-Drop) - Desktop e Mobile
    // --------------------------------------------------------------------------
    function initLayerReordering() {
        const listContainer = document.getElementById('layers-list-container');
        if (!listContainer) return;

        let draggedCard = null;

        function finalizeReorder() {
            if (draggedCard) {
                draggedCard.classList.remove('dragging');
            }
            document.querySelectorAll('.layer-card').forEach(c => {
                c.classList.remove('drag-over');
                c.classList.remove('drag-over-bottom');
            });
            draggedCard = null;
            updateCategoryBadges();
            updateMapLayersOrder();
        }

        // --- Mouse / HTML5 Drag and Drop ---
        listContainer.addEventListener('dragstart', (e) => {
            // Evitar iniciar arrasto ao interagir com inputs, selects, botões ou painéis internos
            if (e.target.closest('input, select, button, .btn-download-kml, .btn-symbology-toggle, .classes-legend-panel, .class-color-input')) {
                e.preventDefault();
                return;
            }

            const card = e.target.closest('.layer-card');
            if (card) {
                draggedCard = card;
                card.classList.add('dragging');
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', card.getAttribute('data-layer-id') || 'layer');
                }
            }
        });

        listContainer.addEventListener('dragend', () => {
            finalizeReorder();
        });

        listContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            finalizeReorder();
        });

        listContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedCard) return;

            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }

            // Auto-expandir categoria se arrastar sobre o cabeçalho colapsado
            const overHeader = e.target.closest('.category-header');
            if (overHeader) {
                const group = overHeader.closest('.layer-category-group');
                if (group && group.classList.contains('collapsed')) {
                    group.classList.remove('collapsed');
                }
            }

            const overCard = e.target.closest('.layer-card');
            if (overCard && overCard !== draggedCard) {
                const targetContainer = overCard.parentNode;
                if (!targetContainer) return;

                document.querySelectorAll('.layer-card').forEach(c => {
                    if (c !== overCard) {
                        c.classList.remove('drag-over');
                        c.classList.remove('drag-over-bottom');
                    }
                });

                const rect = overCard.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                if (e.clientY < midY) {
                    overCard.classList.remove('drag-over-bottom');
                    overCard.classList.add('drag-over');
                    targetContainer.insertBefore(draggedCard, overCard);
                } else {
                    overCard.classList.remove('drag-over');
                    overCard.classList.add('drag-over-bottom');
                    targetContainer.insertBefore(draggedCard, overCard.nextSibling);
                }
                return;
            }

            // Se estiver arrastando sobre o espaço de conteúdo da categoria (ex: vazio ou final)
            const overCategoryContent = e.target.closest('.category-content');
            if (overCategoryContent && !overCard && draggedCard.parentNode !== overCategoryContent) {
                overCategoryContent.appendChild(draggedCard);
            }
        });

        listContainer.addEventListener('dragleave', (e) => {
            const card = e.target.closest('.layer-card');
            if (card) {
                card.classList.remove('drag-over');
                card.classList.remove('drag-over-bottom');
            }
        });

        // --- Suporte a Toque em Dispositivos Móveis (via .drag-handle) ---
        let touchCard = null;

        listContainer.addEventListener('touchstart', (e) => {
            const handle = e.target.closest('.drag-handle');
            if (!handle) return;
            const card = handle.closest('.layer-card');
            if (!card) return;

            touchCard = card;
            touchCard.classList.add('dragging');
        }, { passive: true });

        listContainer.addEventListener('touchmove', (e) => {
            if (!touchCard) return;
            const touch = e.touches[0];
            const elUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!elUnderFinger) return;

            const overCard = elUnderFinger.closest('.layer-card');
            if (overCard && overCard !== touchCard) {
                const targetContainer = overCard.parentNode;
                if (!targetContainer) return;

                const rect = overCard.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                if (touch.clientY < midY) {
                    targetContainer.insertBefore(touchCard, overCard);
                } else {
                    targetContainer.insertBefore(touchCard, overCard.nextSibling);
                }
                if (e.cancelable) e.preventDefault();
                return;
            }

            const overCategoryContent = elUnderFinger.closest('.category-content');
            if (overCategoryContent && !overCard && touchCard.parentNode !== overCategoryContent) {
                overCategoryContent.appendChild(touchCard);
                if (e.cancelable) e.preventDefault();
            }
        }, { passive: false });

        listContainer.addEventListener('touchend', () => {
            if (touchCard) {
                touchCard.classList.remove('dragging');
                touchCard = null;
                finalizeReorder();
            }
        });

        listContainer.addEventListener('touchcancel', () => {
            if (touchCard) {
                touchCard.classList.remove('dragging');
                touchCard = null;
                finalizeReorder();
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
                alert('Por favor, solte arquivos .geojson, .json ou imagens .png/.jpg/.tif');
                return;
            }
            files.forEach(file => processGeoJSONFile(file));
        });
    }

    function processGeoJSONFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const currentBounds = map.getBounds();
                const layerName = file.name.replace(/\.[^/.]+$/, '');
                addDynamicRasterLayer(layerName, e.target.result, currentBounds);
            };
            reader.readAsDataURL(file);
        } else if (['tif', 'tiff'].includes(ext)) {
            alert(`O arquivo GeoTIFF "${file.name}" foi selecionado. Como os rasters georreferenciados foram convertidos com sucesso para a pasta "rasters/", as camadas oficiais de Vulnerabilidade Ambiental já estão carregadas na categoria "Vulnerabilidade Ambiental"!`);
        } else {
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
    }

    function addDynamicRasterLayer(name, dataUrl, bounds) {
        const layerKey = `dyn_raster_${Date.now()}`;
        const paneName = `${layerKey}Pane`;
        if (!map.getPane(paneName)) {
            map.createPane(paneName);
            map.getPane(paneName).style.zIndex = 450;
        }

        const newLayer = L.imageOverlay(dataUrl, bounds, {
            pane: paneName,
            opacity: 0.75,
            interactive: true
        });

        layersGroup[layerKey] = newLayer;
        newLayer.addTo(map);

        const dynCfg = {
            id: layerKey,
            name: `${name} (Raster)`,
            type: 'raster',
            active: true,
            opacity: 0.75,
            badge: 'Raster Upload'
        };

        let targetCat = document.querySelector('.layer-category-group[data-category-id="vulnerabilidade_ambiental"] .category-content');
        if (!targetCat) {
            targetCat = document.querySelector('.layer-category-group .category-content');
        }

        if (targetCat) {
            const card = buildLayerCardElement(dynCfg);
            targetCat.appendChild(card);
            updateCategoryBadges();
        }

        map.fitBounds(bounds, { padding: [30, 30] });
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
                layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    openFeatureInspector({ id: layerKey, name: name, badge: 'Upload', style: { color: strokeColor } }, feature, layer);
                });
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
                            updateCategoryBadges();
                        }

                        if (subLayer.getBounds) {
                            map.fitBounds(subLayer.getBounds(), { maxZoom: 16, animate: true, padding: [40, 40] });
                        } else if (subLayer.getLatLng) {
                            map.setView(subLayer.getLatLng(), 16, { animate: true });
                        }

                        const cfg = LAYERS_CONFIG.find(c => c.id === layerId) || { id: layerId, name: layerId, badge: 'Busca' };
                        openFeatureInspector(cfg, subLayer.feature, subLayer);

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

    // Alternar Sidebar Retrátil com suporte responsivo a Mobile/Tablet
    const sidebar = document.getElementById('sidebar');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const btnFloatingSidebar = document.getElementById('btn-floating-sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    function updateSidebarUI() {
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.contains('collapsed');
        const isMobileOrTablet = window.innerWidth <= 850;

        if (isCollapsed) {
            if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
            if (btnFloatingSidebar) btnFloatingSidebar.classList.add('visible');
        } else {
            if (isMobileOrTablet) {
                if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
            } else {
                if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
            }
            if (btnFloatingSidebar) btnFloatingSidebar.classList.remove('visible');
        }
    }

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('collapsed');
        updateSidebarUI();
        setTimeout(() => fitMunicipio(true), 320);
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('collapsed');
        updateSidebarUI();
        setTimeout(() => fitMunicipio(true), 320);
    }

    function toggleSidebar() {
        if (!sidebar) return;
        if (sidebar.classList.contains('collapsed')) {
            openSidebar();
        } else {
            closeSidebar();
        }
    }

    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
    if (btnFloatingSidebar) btnFloatingSidebar.addEventListener('click', openSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

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

            if (sidebar && sidebar.classList.contains('collapsed')) {
                openSidebar();
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

    // Em dispositivos móveis ou tablets, inicia com a sidebar recolhida para exibir o mapa imediatamente
    if (window.innerWidth <= 850 && sidebar) {
        sidebar.classList.add('collapsed');
    }
    updateSidebarUI();

    // Executar centralização inicial automática com compensação do painel lateral
    fitMunicipio(false);
    setTimeout(() => {
        updateSidebarUI();
        fitMunicipio(false);
    }, 300);
    setTimeout(() => fitMunicipio(false), 600);

    // Modal do Artigo Científico (Bacia do Ribeirão Onça Grande)
    const modalArticle = document.getElementById('modal-article-onca');
    const btnCloseArticleModal = document.getElementById('btn-close-article-modal');
    const btnCopyCitation = document.getElementById('btn-copy-citation');

    function openArticleModal() {
        if (modalArticle) modalArticle.classList.add('active');
    }

    function closeArticleModal() {
        if (modalArticle) modalArticle.classList.remove('active');
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-open-article-info')) {
            openArticleModal();
        }
    });

    if (btnCloseArticleModal) {
        btnCloseArticleModal.addEventListener('click', closeArticleModal);
    }

    if (modalArticle) {
        modalArticle.addEventListener('click', (e) => {
            if (e.target === modalArticle) closeArticleModal();
        });
    }

    if (btnCopyCitation) {
        btnCopyCitation.addEventListener('click', () => {
            const citationEl = document.getElementById('article-citation-text');
            if (citationEl) {
                const text = citationEl.innerText.trim();
                navigator.clipboard.writeText(text).then(() => {
                    const originalHtml = btnCopyCitation.innerHTML;
                    btnCopyCitation.innerHTML = '<i class="fas fa-check" style="color: #16a34a;"></i> Copiado!';
                    setTimeout(() => {
                        btnCopyCitation.innerHTML = originalHtml;
                    }, 2500);
                }).catch(() => {
                    alert('Citação selecionada. Pressione Ctrl+C para copiar.');
                });
            }
        });
    }

    window.addEventListener('resize', () => {
        updateSidebarUI();
        fitMunicipio(false);
    });
});
