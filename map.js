class ElectionMap {
  fillLayerId = 'fillLayer';
  lineLayerId = 'lineLayer';
  sourceId = 'adm7';
  hoveredStateId = null;
  currentYear = '2024';
  currentFill = 'winner';
  legendScales = {};
  legendLabels = {};
  colorScales = {
    PiGY:  [-50, '#8e0152', -40, '#c51b7d', -30, '#de77ae', -20, '#f1b6da', -10, '#fde0ef', 0, '#f7f7f7', 10, '#e6f5d0', 20, '#b8e186', 30, '#7fbc41', 40, '#4d9221', 50, '#276419'],
    RdBu:  [-50, '#67001f', -40, '#b2182b', -30, '#d6604d', -20, '#f4a582', -10, '#fddbc7', 0, '#f7f7f7', 10, '#d1e5f0', 20, '#92c5de', 30, '#4393c3', 40, '#2166ac', 50, '#053061'],
  }
  fillLayerFillOpacity = {};
  fillLayerFilter = {};
  partyColors = {};
  initialCenter = null;
  initialZoom = null;

  constructor(accessToken, {
    container,
    style,
    source,
    sourceLayer,
    center,
    zoom,
    minZoom,
    initialSelect,
    hash,
    years,
    parties,
    partyColors,
    scrollZoom,
  }) {
    this.source = source;
    this.sourceLayer = sourceLayer;
    this.initialSelect = initialSelect || '2024winner';
    this.initialCenter = [...center];
    this.initialZoom = zoom;
    this.partyColors = partyColors;

    mapboxgl.accessToken = accessToken;
    mapboxgl.clearStorage();

    this.map = new mapboxgl.Map({
      container,
      style,
      center,
      zoom: zoom || 5,
      minZoom: minZoom || 5,
      hash: Boolean(hash),
      attributionControl: false,
    });

    if (!scrollZoom) {
      this.map.scrollZoom.disable();
    }

    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    this.setFillLayerFillOpacity(years, parties);
    this.setFillLayerFilter(years, parties);
    this.setLegendLabels(years, parties);
    this.setLegendScales(years, parties);
    this.setLayerOptions(years, parties);

    this.map.on('load', () => {
      this.addLayers();
      this.addControls();
      this.addButtonsListeners();
      this.showButtons();
      this.setLegend(this.initialSelect);
    });
    this.map.on('mousemove', this.fillLayerId, (e) => {
      this.updateHoverState(e);
      this.updatePopup(e);
    });
    this.map.on('mouseleave', this.fillLayerId, (e) => {
      this.unhoverSection(e);
    });
    this.map.on('click', this.fillLayerId, (e) => {
      this.onMouseClick(e);
    });
  }

  getYearKey(i) {
    return i === 0 ? 'last' : 'curr';
  }

  setFillLayerFillOpacity(years, parties) {
    this.fillLayerFillOpacity = {};
    years.forEach((year, i) => {
      const prefix = this.getYearKey(i);
      this.fillLayerFillOpacity[`winner${year}`] = ['interpolate', ["linear", 1], ["get", `${prefix}_winner1_val`], 0, 0, 50, 0.9];
      parties.forEach((party) => {
        this.fillLayerFillOpacity[`${party.toLowerCase()}${year}`] = ['interpolate', ["linear", 1], ["get", `${prefix}_${party.toUpperCase()}`], 9.99, 0.05, 10, 0.2, 19.99, 0.2, 20, 0.4, 29.99, 0.4, 30, 0.6, 39.99, 0.6, 40, 0.8];
      });
    });
  }

  setFillLayerFilter(years, parties) {
    this.fillLayerFilter = {
      bloquesdiff: ['all', ['has', 'last_block'], ['has', 'curr_block']],
    };
    years.forEach((year, i) => {
      const prefix = this.getYearKey(i);
      this.fillLayerFilter[`winner${year}`] = ['has', `${prefix}_winner1_val`];
      this.fillLayerFilter[`bloques${year}`] = ['has', `${prefix}_block`];
    });
    parties.forEach((party) => {
      this.fillLayerFilter[`${party.toLowerCase()}diff`] = ['has', `diff_${party.toUpperCase()}`];
    });
  }

  setLegendLabels(years, parties) {
    this.legendLabels = {
      winnerdiff: 'Partido ganador',
      bloquesdiff: 'Cambio en porcentaje de voto a bloque',
    };
    years.forEach((year) => {
      this.legendLabels[`bloques${year}`] = 'Porcentaje de voto a bloque';
      parties.forEach((party) => {
        this.legendLabels[`${party.toLowerCase()}${year}`] = 'Porcentaje de voto';
        this.legendLabels[`${party.toLowerCase()}diff`] = 'Cambio en porcentaje de voto';
      });
    });
  }

  setLegendScales(years, parties) {
    this.legendScales = {
      winnerdiff: [
        {color: "#7fbc41", label: 'Mismo partido',},
        {color: "#d6604d", label: 'Diferente partido',},
      ],
      bloquesdiff: [
        {color: this.colorScales.RdBu[1], label: '+50 izq'},
        {color: this.colorScales.RdBu[5], label: '+30'},
        {color: this.colorScales.RdBu[9], label: '+10'},
        {color: this.colorScales.RdBu[13], label: '+10'},
        {color: this.colorScales.RdBu[17], label: '+30'},
        {color: this.colorScales.RdBu[21], label: '+50 der'},
      ],
    };
    parties.forEach((party) => {
      this.legendScales[`${party.toLowerCase()}diff`] = [
        {color: this.colorScales.PiGY[1], label: '-50',},
        {color: this.colorScales.PiGY[5], label: '-30',},
        {color: this.colorScales.PiGY[9], label: '-10',},
        {color: this.colorScales.PiGY[13], label: '+10',},
        {color: this.colorScales.PiGY[17], label: '+30',},
        {color: this.colorScales.PiGY[21], label: '+50',},
      ];
      years.forEach((year) => {
        this.legendScales[`${party.toLowerCase()}${year}`] = [
          {color: `${this.partyColors[party.toUpperCase()]}0d`, label: '0-10',},
          {color: `${this.partyColors[party.toUpperCase()]}33`, label: '10-20',},
          {color: `${this.partyColors[party.toUpperCase()]}66`, label: '20-30',},
          {color: `${this.partyColors[party.toUpperCase()]}99`, label: '30-40',},
          {color: `${this.partyColors[party.toUpperCase()]}cc`, label: '+40',},
        ];
      });
    });

    years.forEach((year) => {
      this.legendScales[`bloques${year}`] = [
        {color: this.colorScales.RdBu[1], label: '+50 izq',},
        {color: this.colorScales.RdBu[5], label: '+30',},
        {color: this.colorScales.RdBu[9], label: '+10',},
        {color: this.colorScales.RdBu[13], label: '+10',},
        {color: this.colorScales.RdBu[17], label: '+30',},
        {color: this.colorScales.RdBu[21], label: '+50 der',},
      ];
    });
  }

  setLayerOptions(years, parties) {
    this.fillLayerFillColor = {
      bloquesdiff: ['interpolate', ['linear', 1], ["-", ['get', 'curr_block'], ['get', 'last_block']], ...this.colorScales.RdBu],
      winnerdiff: ["case", ["==", ["get", "last_winner1_key"], ["get", "curr_winner1_key"]], "#7fbc41", "#d6604d"],
    };

    parties.forEach((party) => {
      years.forEach((year, i) => {
        const prefix = this.getYearKey(i);
        this.fillLayerFillColor[`${party.toLowerCase()}${year}`] = [
          "case",
          ["has", `${prefix}_${party.toUpperCase()}`],
          this.partyColors[party.toUpperCase()],
          "#F7F7F7"
        ];
      });
      this.fillLayerFillColor[`${party.toLowerCase()}diff`] = [
        'interpolate',
        ['linear', 1],
        ['get', `diff_${party.toUpperCase()}`],
        ...this.colorScales.PiGY
      ];
    });

    years.forEach((year, i) => {
      const prefix = this.getYearKey(i);
      this.fillLayerFillColor[`winner${year}`] = ["match", ["get", `${prefix}_winner1_key`], ...Object.entries(this.partyColors).flat(), "#999"];
      this.fillLayerFillColor[`bloques${year}`] = ['interpolate', ['linear', 1], ['get', `${prefix}_block`], ...this.colorScales.RdBu];
    });
  }

  addLayers() {
    // Add layer source
    this.map.addSource(this.sourceId, { type: 'vector', url: this.source });

    // Fill layer used to show results
    this.map.addLayer({
      id: this.fillLayerId,
      source: this.sourceId,
      type: 'fill',
      'source-layer': this.sourceLayer,
      filter: this.fillLayerFilter[this.initialSelect],
      layout: {
        visibility: 'visible',
      },
      paint: {
        'fill-color': this.fillLayerFillColor[this.initialSelect],
        'fill-opacity': this.fillLayerFillOpacity[this.initialSelect],
        'fill-outline-color': this.fillLayerFillColor[this.initialSelect],
      },
    }, 'road-simple');

    // Line layer used to show hover effects
    this.map.addLayer({
      id: this.lineLayerId,
      source: this.sourceId,
      type: 'line',
      'source-layer': this.sourceLayer,
      paint: {
        'line-color': 'black',
        'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0],
      },
    });

  }
  
  addControls() {
    // Add navigation controls
    this.map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  
    // Add search box
    this.map.addControl(new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      language: 'es',
      country: 'es',
      types: 'region,place,locality,address',
      placeholder: 'Busca tu calle',
    }));
  }

  addButtonsListeners() {
    document.querySelectorAll('.js-control').forEach((control) => {
      control.addEventListener('click', (e) => {
        this.onControlButtonClick(e);
      });
    });
    document.querySelectorAll('.js-year').forEach((control) => {
      control.addEventListener('click', (e) => {
        this.onYearButtonClick(e);
      });
    });
    document.getElementById('zoom-out').addEventListener('click', (e) => {
      this.map.easeTo({
        center: this.initialCenter,
        zoom: this.initialZoom,
        duration: 1600,
        });
    });
  }

  showButtons() {
    document.getElementById('custom-controls').classList.remove('hidden');
    document.getElementById('custom-buttons').classList.remove('hidden');
  }

  updateHoverState(e) {
    if (!e.features.length) return;
    if (this.hoveredStateId) {
      this.map.setFeatureState({
        source: this.sourceId,
        sourceLayer: this.sourceLayer,
        id: this.hoveredStateId,
      }, { hover: false });
    }
    this.hoveredStateId = e.features[0].id;
    this.map.setFeatureState({
      source: this.sourceId,
      sourceLayer: this.sourceLayer,
      id: this.hoveredStateId,
    }, { hover: true });
  }

  updatePopup(e) {
    if (!e.features.length) return;
    this.map.getCanvas().style.cursor = 'pointer';
    this.popup.setLngLat(e.lngLat).setHTML(this.popupHtml(e.features[0].properties)).addTo(this.map);
  }

  unhoverSection(e) {
    this.map.getCanvas().style.cursor = '';
    this.popup.remove();
    if (this.hoveredStateId) {
      this.map.setFeatureState({
        source: this.sourceId,
        sourceLayer: this.sourceLayer,
        id: this.hoveredStateId,
      }, { hover: false });
      this.hoveredStateId = null;
    }
  }

  onMouseClick(e) {
    console.log(e.features[0].properties);
  }

  popupHtml(section) {
    return `
      <div class="mappop-wrapper">
        ${this.popupHeader(section)}
        <div class="mappop-body">
          ${this.popupMetaTable(section)}
          ${this.popupResultsTable(section)}
        </div>
      </div>
    `;
  }

  popupHeader(section) {
    if (!section.CDIS) {
      return `
        <header class="mappop-header">
          <h3>${section.NMUN}</h3>
        </header>
      `;
    }
    return `
      <header class="mappop-header">
        <h3>${section.NMUN}</h3>
        <span></span>
      </header>
    `;
  }

  popupMetaTable(section) {
    return `
      <table class="mappop-table mappop-table--meta">
        <thead>
          <tr>
            <th></th>
            <th class="cr">2020</th>
            <th class="cr">2024</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Participación</td>
            <td class="cr">${section.last_census > 1 ? section.last_turnout : '?'}%</td>
            <td class="cr">${section.curr_census > 1 ? section.curr_turnout : '?'}%</td>
          </tr>
          <tr>
            <td>Votos en blanco</td>
            <td class="cr">${section.last_votes_white === undefined ? '?' : section.last_votes_white}</td>
            <td class="cr">${section.curr_votes_white === undefined ? '?' : section.curr_votes_white}</td>
          </tr>
          <tr>
            <td>Votos nulos</td>
            <td class="cr">${section.last_votes_null === undefined ? '?' : section.last_votes_null}</td>
            <td class="cr">${section.curr_votes_null === undefined ? '?' : section.curr_votes_null}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  popupResultsTable(p) {
    let results;
    let year;
    if (this.currentYear === '2020') {
      if (!p.last_results) return '';
      results = this.popupStrResultsToObj(p.last_results);
      year = 2020;
    } else {
      if (!p.curr_results) return '';
      results = this.popupStrResultsToObj(p.curr_results);
      year = 2024;
    }
    const rows = Object.keys(results)
      .sort((a, b) => results[b].votes - results[a].votes)
      .map((d) => `
        <tr>
          <td>
            <span class="mappop-partycolor" style="background: ${this.partyColors[d]}"></span>
            <span class="mappop-partyname">${results[d].name}</span>
          </td>
          <td class="cr">${results[d].votes}</td>
          <td class="cr">${results[d].percent}%</td>
        </tr>
      `);
    return `
      <table class="mappop-table mappop-table--results">
        <thead>
          <tr>
            <th>Resultados ${year}</th>
            <th class="cr">Votos</th>
            <th class="cr">% Voto</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;
  }

  popupStrResultsToObj(strResults) {
    return strResults.split('~').reduce((acc, curr) => {
      const vals = curr.split('|');
      acc[vals[0]] = {
        name: vals[1],
        votes: +vals[2],
        percent: (+vals[3]).toFixed(2),
      };
      return acc;
    }, {})
  }

  setLegend(scaleName) {
    if (!this.legendLabels[scaleName]) {
      // if clicked legend it's empty, hide legends box
      document.getElementById('legends').classList.add('hidden');
      return;
    }
  
    document.getElementById('legends').classList.remove('hidden');
    document.getElementById('legends-head').innerHTML = this.legendLabels[scaleName];
    const container = document.getElementById('legends-body');
    container.innerHTML = '';
  
    this.legendScales[scaleName].filter((d) => !d.hideLegend).forEach((l) => {
      container.innerHTML += `
        <div class="map-legend">
          <div class="map-legend-color" style="background-color: ${l.color}"></div>
          <div class="map-legend-label">${l.label}</div>
        </div>
      `;
    });
  };

  setMapFill() {
    const fillName = `${this.currentFill}${this.currentYear}`;
    this.map.setFilter(this.fillLayerId, this.fillLayerFilter[fillName]);
    this.map.setPaintProperty(this.fillLayerId, 'fill-color', this.fillLayerFillColor[fillName]);
    this.map.setPaintProperty(this.fillLayerId, 'fill-opacity', this.fillLayerFillOpacity[fillName]);
    this.map.setPaintProperty(this.fillLayerId, 'fill-outline-color', this.fillLayerFillColor[fillName]);

    // Set map legend
    this.setLegend(fillName);
  }

  onControlButtonClick(e) {
    // If clicked button is currently active don't do anything
    if (e.target.classList.contains('is-active')) return;
  
    // Remove other buttons class is-active
    document.querySelectorAll('.js-control').forEach((control) => {
      control.classList.remove('is-active');
    });
  
    // Apply change
    this.currentFill = e.target.dataset.fill;
    this.setMapFill();

    // Add class to current button
    e.target.classList.add('is-active');
  };

  onYearButtonClick(e) {
    // If clicked button is currently active don't do anything
    if (e.target.classList.contains('is-active')) return;
  
    // Remove other buttons class is-active
    document.querySelectorAll('.js-year').forEach((control) => {
      control.classList.remove('is-active');
    });

    // Apply change
    this.currentYear = e.target.dataset.year;
    this.setMapFill();

    // Add class to current button
    e.target.classList.add('is-active');
  };
};
