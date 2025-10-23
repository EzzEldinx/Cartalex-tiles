/*
 * Import the SubFilter class.
 * The .js extension is important for ES modules in the browser.
 */
import { SubFilter } from "./SubFilter.js";

/**
 * Represents a main filter category (e.g., "Vestiges", "Découvertes").
 * It manages a collection of SubFilters.
 */
export class Filter {
    /**
     * Creates a new Filter instance.
     * @param {object} filter_config - The configuration object for this filter from filters_config.js.
     */
    constructor(filter_config){
        this.active = false; // Tracks if the filter has any active subfilters
        this.name = filter_config['name']; // The internal ID name (e.g., "vestiges")

        /*
         * *** THIS LINE WAS CORRECTED ***
         * Use the 'displayName' from the config for the UI.
         * If it doesn't exist, fall back to the internal 'name'.
         * The original code incorrectly used 'config' instead of 'filter_config'.
         */
        this.displayName = filter_config.displayName || this.name;

        this.infos = filter_config['infos']; // Informational text about the filter
        this.sub_filters = []; // Array to hold instantiated SubFilter objects
        this.sub_filters_config = filter_config['sub_filters']; // Raw config for subfilters
    }

    /**
     * Initializes all subfilters associated with this filter.
     * It creates new SubFilter instances and fetches their initial values from the API.
     */
    async initSubFilters(){
        for (let sub_filter_config of this.sub_filters_config){
            // Create a new SubFilter instance
            let new_sub_filter = new SubFilter(this.name, sub_filter_config);
            // Fetch its values (e.g., "Eglise", "Mosquée") from the API
            await new_sub_filter.initValues();
            // Add the initialized subfilter to our list
            this.addSubFilter(new_sub_filter);
        }
    }

    /**
     * Adds a SubFilter instance to this filter's list.
     * @param {SubFilter} subFilter - The SubFilter instance to add.
     */
    addSubFilter(subFilter){
        this.sub_filters.push(subFilter);
    }

    /**
     * Gets all SubFilter instances for this filter.
     * @returns {Array<SubFilter>}
     */
    getSubFilters(){
        return this.sub_filters;
    }

    /**
     * Finds a specific SubFilter by its internal name.
     * @param {string} name - The name of the subfilter to find.
     * @returns {SubFilter|undefined}
     */
    getSubFilter(name){
        // Using .find() is safer than .filter()[0] as it stops on the first match
        return this.sub_filters.find(sub_filter => sub_filter.name == name);
    }

    /**
     * Gets a list of all *active* subfilters.
     * An active subfilter is one that has values checked, or is an enabled numeric filter with a value.
     * @returns {Array<SubFilter>}
     */
    getActiveSubFilters(){
        return this.sub_filters.filter(sub_filter => {
            if (sub_filter.isNumeric) {
                // A numeric filter is active *only if* it's enabled AND has a value set
                return sub_filter.isEnabled() && (sub_filter.getFloor() !== '' || sub_filter.getCeil() !== '');
            }
            // A regular filter is active if it has any checked values
            return sub_filter.getSelectedValues().length > 0;
        });
    }

    /**
     * Gets the informational text for this filter.
     * @returns {string}
     */
    getInfos(){
        return this.infos;
    }

    /**
     * Fetches the list of feature IDs from the API that match this filter's active subfilters.
     * This is the function that was missing and caused the error.
     * @param {string} api_at - The base URL of the API.
     * @param {string} layer_name - The name of the main layer (e.g., "sitesFouilles").
     * @returns {Array<number|string>} A list of feature IDs.
     */
    async getSelectedFeatures(api_at, layer_name){
        let selected_features = [];
        
        // Ensure api_at ends with a slash
        const base_api_url = api_at.endsWith('/') ? api_at : `${api_at}/`;
        let requestApiUrl = `${base_api_url}${layer_name}/${this.name}?`;

        // Build the query string from all active subfilters
        for (let subfilter of this.getActiveSubFilters()){
            if (!subfilter.isNumeric){
                // For list filters, join values with '|' (e.g., &caracterisation=Eglise|Mosquée)
                requestApiUrl += `&${subfilter.name}=${subfilter.getSelectedValues().join('|')}`;
            } else {
                // For numeric filters, add floor and/or ceil if they exist
                if (subfilter.getFloor()) {
                    requestApiUrl += `&${subfilter.name}.floor=${subfilter.request_options.floor}|${subfilter.getFloor()}`;
                }
                if (subfilter.getCeil()) {
                    requestApiUrl += `&${subfilter.name}.ceil=${subfilter.request_options.ceil}|${subfilter.getCeil()}`;
                }
            }
        }

        console.log("Selection request to send:", requestApiUrl);
        try {
            let request_result = await fetch(requestApiUrl);
            let json_result = await request_result.json();
            
            // Extract the 'id' from each returned feature
            if (Array.isArray(json_result)) {
                for (let feature of json_result){
                    selected_features.push(feature.id);
                }
            } else {
                console.warn("API did not return an array:", json_result);
            }
        } catch (error) {
            console.error(`Failed to fetch features for filter ${this.name}:`, error);
        }
        return selected_features;
    }
}