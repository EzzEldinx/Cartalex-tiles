export function buildFilterUI(filters) {
  const container = document.getElementById('volet_haut');
  if (!container) return;
  
  let html = '<div class="filter-collection-content">';
  for (const filterName in filters) {
    const filter = filters[filterName];
    html += `
      <div class="filter-content" data-filter-name="${filter.name}">
        <h3 class="filter-name">${filter.name}</h3>
        <div class="subfilter-container">
    `;
    for (const subFilter of filter.getSubFilters()) {
      html += `
        <div class="subfilter-content-wrapper">
          <h4 class="subfilter-title" data-subfilter-name="${subFilter.name}">${subFilter.alias || subFilter.name}</h4>
          <ul class="subfilter-content">
      `;
      if (subFilter.isNumeric) {
        const idPrefix = `${filter.name}-${subFilter.name}`;
        html += `
          <li class="numeric-filter-inputs">
            <div>
              <label for="${idPrefix}-floor">Date debut :</label>
              <input type="number" id="${idPrefix}-floor" class="numeric-input-floor" placeholder="YYYY">
            </div>
            <div>
              <label for="${idPrefix}-ceil">Date fin :</label>
              <input type="number" id="${idPrefix}-ceil" class="numeric-input-ceil" placeholder="YYYY">
            </div>
            <div>
              <label for="${idPrefix}-apply">Appliquer ce filtre :</label>
              <input type="checkbox" id="${idPrefix}-apply" class="numeric-apply-checkbox">
            </div>
          </li>`;
      } else {
        subFilter.getValues().forEach(valueObj => {
          const value = valueObj[subFilter.alias || subFilter.name];
          html += `
            <li>
              <input type="checkbox" id="${filter.name}-${subFilter.name}-${value}" name="${subFilter.name}" value="${value}">
              <label for="${filter.name}-${subFilter.name}-${value}">${value}</label>
            </li>
          `;
        });
      }
      html += `</ul></div>`;
    }
    html += `</div></div>`;
  }
  html += '</div><button class="close-panel-button">Fermer le volet</button>';
  container.innerHTML = html;
}

export function buildLayerList(layers, map, historicalMapIds = []) {
    const container = document.getElementById('items');
    if (!container) return;

    // START: HIDE ANIMATION LAYERS
    // Define the IDs of the animation layers that should be hidden from the UI.
    const hiddenLayerIds = ['sites_fouilles-pulse', 'sites_fouilles-waves'];
    // END: HIDE ANIMATION LAYERS

    const layerNameMap = {
        'osm-background': 'OpenStreetMap - Humanitarian',
        'satellite-background': 'Google Earth',
        'parcelles_region-fill': 'Cadastre Alexandrin (Survey of Egypt, 1933-1948 / CEAlex)',
        'espaces_publics-fill': "Espaces publics d'Alexandrie (CEAlex)",
        'emprises-fill': 'Emprises des sites de fouilles (CEAlex)',
        'noms_rues-labels': 'Noms de rues (CEAlex)',
        'littoral-line': 'Littoral (CEAlex)',
        'sites_fouilles-points': 'Découvertes archéologiques, quartier des Palais Royaux (CEAlex)'
    };

    let html = '';
    layers.forEach(layer => {
        // START: HIDE ANIMATION LAYERS
        // If the current layer's ID is in our hidden list, skip it and do not create a list item.
        if (hiddenLayerIds.includes(layer.id)) {
            return; 
        }
        // END: HIDE ANIMATION LAYERS

        let layerName = layerNameMap[layer.id] || layer.id.replace(/-/g, ' ');

        const isVisible = map.getLayoutProperty(layer.id, 'visibility') !== 'none';
        const checkedAttribute = isVisible ? 'checked' : '';

        html += `
            <li class="listitem">
                <input type="checkbox" id="layer-${layer.id}" data-layer-id="${layer.id}" ${checkedAttribute}>
                <label for="layer-${layer.id}">${layerName}</label>`;
        
        if (historicalMapIds.includes(layer.id) || layer.id === 'parcelles_region-fill') {
            html += `
                <div class="slider-container" style="display: ${isVisible ? 'block' : 'none'};">
                    <input type="range" min="0" max="100" value="100" class="opacity-slider" data-layer-id="${layer.id}">
                </div>`;
        }
        html += `</li>`;
    });
    container.innerHTML = html;
}

export function attachAllEventListeners(filters, onFilterChangeCallback, onLayerToggleCallback, onOpacityChangeCallback) {
  const voletHaut = document.getElementById('volet_haut');
  const openFilterBtn = document.querySelector('.onglets_haut a.ouvrir');
  const closeFilterBtn = voletHaut.querySelector('.close-panel-button');

  if (voletHaut && openFilterBtn && closeFilterBtn) {
    openFilterBtn.addEventListener('click', (e) => { e.preventDefault(); voletHaut.classList.add('is-open'); });
    closeFilterBtn.addEventListener('click', (e) => { e.preventDefault(); voletHaut.classList.remove('is-open'); });
  }

  const voletGaucheClos = document.getElementById('volet_gauche_clos');
  const voletGauche = document.getElementById('volet_gauche');
  const openLayerBtn = voletGaucheClos.querySelector('.onglets_gauche a.ouvrir');
  const closeLayerBtn = voletGaucheClos.querySelector('.onglets_gauche a.fermer');
  if (voletGauche && openLayerBtn && closeLayerBtn) {
      openLayerBtn.addEventListener('click', (e) => { e.preventDefault(); voletGauche.classList.add('is-open'); });
      closeLayerBtn.addEventListener('click', (e) => { e.preventDefault(); voletGauche.classList.remove('is-open'); });
  }

  document.querySelectorAll('.subfilter-title').forEach(title => {
    title.addEventListener('click', () => {
      const content = title.nextElementSibling;
      const isActive = title.classList.contains('active');
      title.closest('.subfilter-container').querySelectorAll('.subfilter-content').forEach(c => { c.style.display = 'none'; });
      title.closest('.subfilter-container').querySelectorAll('.subfilter-title').forEach(t => { t.classList.remove('active'); });
      if (!isActive) {
        content.style.display = 'block';
        title.classList.add('active');
      }
    });
  });

  document.querySelectorAll('.subfilter-content input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const { name, value, checked } = e.target;
      const filterName = e.target.closest('.filter-content').dataset.filterName;
      const filter = filters[filterName];
      if (!filter) return;
      const subFilter = filter.getSubFilter(name);
      if (!subFilter) return;
      if (checked) { subFilter.checkValue(value); } 
      else { subFilter.unCheckValue(value); }
      filter.active = filter.getActiveSubFilters().length > 0;
      onFilterChangeCallback();
    });
  });

  document.querySelectorAll('.numeric-filter-inputs').forEach(numericFilterLI => {
      const filterContent = numericFilterLI.closest('.filter-content');
      const subfilterTitle = numericFilterLI.closest('.subfilter-content-wrapper').querySelector('.subfilter-title');
      
      const filterName = filterContent.dataset.filterName;
      const subFilterName = subfilterTitle.dataset.subfilterName;

      const filter = filters[filterName];
      if (!filter) return;
      const subFilter = filter.getSubFilter(subFilterName);
      if (!subFilter || !subFilter.isNumeric) return;

      const floorInput = numericFilterLI.querySelector('.numeric-input-floor');
      const ceilInput = numericFilterLI.querySelector('.numeric-input-ceil');
      const applyCheckbox = numericFilterLI.querySelector('.numeric-apply-checkbox');

      const updateFilter = () => {
          subFilter.setFloor(floorInput.value || '');
          subFilter.setCeil(ceilInput.value || '');
          subFilter.setEnabled(applyCheckbox.checked);
          filter.active = filter.getActiveSubFilters().length > 0;
          onFilterChangeCallback();
      };

      floorInput.addEventListener('input', updateFilter);
      ceilInput.addEventListener('input', updateFilter);
      applyCheckbox.addEventListener('change', updateFilter);
  });

  document.querySelectorAll('#items input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
          const layerId = e.target.dataset.layerId;
          const isVisible = e.target.checked;
          onLayerToggleCallback(layerId, isVisible);
          const sliderContainer = e.target.closest('.listitem').querySelector('.slider-container');
          if (sliderContainer) {
              sliderContainer.style.display = isVisible ? 'block' : 'none';
          }
      });
  });

  document.querySelectorAll('.opacity-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
        const layerId = e.target.dataset.layerId;
        const opacityValue = parseInt(e.target.value, 10) / 100;
        onOpacityChangeCallback(layerId, opacityValue);
    });
  });
}

