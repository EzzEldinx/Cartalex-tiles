import { Filter } from "./Filter";

export class FilterCollection {
    constructor(layerName, filters_config, api_at){
      this.filters_config = filters_config;
      this.layerName = layerName;
      this.filters = {};
      this.api_at = api_at;
    };

    async initFilters(){
        for (let filter_config of this.filters_config){
          let filter = new Filter(filter_config);
          await filter.initSubFilters();
          this.addFilter(filter);
        }
      console.log("Initialisation des filtres terminée dans le thread FilterCollection.");
      return true;
      }

    addFilter(filter){
      this.filters[filter.name] = filter;
    }

    getFilters(){
      console.log("Filters : ", this.filters);
      console.log("Filters values from getFilters() : ", Object.values(this.filters));
      return this.filters;
    }

    getActiveFilters(){
      return Object.values(this.filters).filter(filter => filter.active == true);
    }

    async getFilteredIds(){
      const activeFilters = this.getActiveFilters();
      if (activeFilters.length === 0) {
        return undefined; // Return undefined if no filters are active
      }

      // Fetch results for all active filters in parallel
      const resultsByFilter = await Promise.all(
        activeFilters.map(filter => filter.getSelectedFeatures(this.api_at, this.layerName))
      );

      resultsByFilter.forEach((ids, index) => {
        console.log(`Selected features from filter ${activeFilters[index].name} :`, ids);
      });

      if (resultsByFilter.length === 0) {
          return [];
      }
      
      // ** START: CORRECTED INTERSECTION LOGIC **
      // Use the 'reduce' method to find the intersection of all result arrays
      const intersection = resultsByFilter.reduce((acc, currentArray) => {
        // On the first iteration, acc is the first array.
        // On subsequent iterations, acc is the intersection of the previous arrays.
        return acc.filter(id => currentArray.includes(id));
      });
      // ** END: CORRECTED INTERSECTION LOGIC **

      console.log("Final intersection of IDs:", intersection);
      return intersection;
    }
}