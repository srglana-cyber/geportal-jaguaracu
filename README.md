# 🌍 Geoportal de Jaguaraçu - MG | WebGIS Interativo

> **Sistema de Informações Geográficas (WebGIS) do Município de Jaguaraçu - MG**  
> **Concepção, Adaptação e Prototipação:** [Prof. Sérgio Lana (Currículo Lattes)](http://lattes.cnpq.br/2773267607623633)  
> **Fontes Oficiais das Informações Geoespaciais:** INDE (Infraestrutura Nacional de Dados Espaciais), IDE-SISEMA (MG) e Prefeitura Municipal de Jaguaraçu.

---

## 🚀 Funcionalidades Principais

- **21 Camadas Oficiais Georreferenciadas:**
  - Limite Municipal Oficial (Jaguaraçu) e Limites Distritais temáticos (Sede, Lagoa de Pau, Lavrinha e Entorno).
  - Meio Ambiente e Recursos Naturais: APA Jaguaraçu (Lei 555/98), Áreas Prioritárias de Conservação, Cobertura Vegetal, Solos (Pedologia), Geomorfologia, Geologia e Suscetibilidade à Erosão.
  - Recursos Hídricos: Circunscrições Hidrográficas (CBH Piracicaba - DO2 e CBH Piranga - DO1), Rede Hidrográfica e Nascentes Mapeadas.
  - Infraestrutura e Transporte: Rodovia Federal (BR-381), Rodovias Estaduais, Estradas Vicinais, Faces de Logradouros Urbanos e Rotas de Cicloturismo.
  - Cadastro Ambiental Rural (CAR): Análise territorial e área dos imóveis rurais.
- **Simbologia por Atributos & Legendas Interativas:**
  - Ao ativar uma camada temática, a paleta de classes abre automaticamente para personalização de cores em tempo real no mapa e nas legendas.
- **Exportação KML:**
  - Botão de download individual em formato `.kml` para todas as camadas (compatível com Google Earth).
- **Reordenação de Camadas:**
  - Arraste os cards (drag-and-drop) para alterar a ordem de sobreposição visual das camadas no mapa.
- **Mapas de Fundo (Basemaps):**
  - Satélite de Alta Resolução (Esri), Topográfico (OpenTopoMap) e Ruas (OpenStreetMap / CARTO Voyager).
- **Módulo de GeoColaboração Cidadã:**
  - Formulário para apontamento de ocorrências e sugestões com armazenamento local (`localStorage`) e exportação em GeoJSON.
- **Ferramentas de Medição:**
  - Cálculo de distâncias e áreas com precisão métrica.

---

## 💻 Como Rodar Localmente

Basta abrir o arquivo `index.html` diretamente em qualquer navegador moderno (Chrome, Edge, Firefox, Safari) ou iniciar um servidor estático simples:

```bash
# Python
python -m http.server 8000

# Ou Node (npx)
npx serve .
```

---

## ☁️ Como Publicar no Vercel (Passo a Passo)

1. **Acesse:** [https://vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
2. **Importar Projeto:**
   - Clique em **"Add New..."** > **"Project"**.
   - Conecte o repositório `srglana-cyber/geportal-jaguaracu`.
3. **Configuração de Deploy:**
   - **Framework Preset:** Deixe em *Other* (ou *Plain HTML*).
   - **Root Directory:** `./`
   - O arquivo `vercel.json` incluído neste repositório cuidará de todas as rotas e tipos MIME automaticamente.
4. **Deploy:**
   - Clique no botão **"Deploy"**.
   - Em menos de 1 minuto seu Geoportal estará online em uma URL como `https://geportal-jaguaracu.vercel.app`.

---

## 📜 Créditos e Licença

- **Autor:** Prof. Sérgio Lana ([http://lattes.cnpq.br/2773267607623633](http://lattes.cnpq.br/2773267607623633))
- **Dados:** INDE, IDE-SISEMA e Prefeitura Municipal de Jaguaraçu.
