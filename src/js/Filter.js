import { SubFilter } from "./SubFilter";

export class Filter {
    constructor(filter_config){
        this.active = false;
        this.name = filter_config['name'];
        this.infos = filter_config['infos'];
        this.sub_filters = [];
        this.sub_filters_config = filter_config['sub_filters'];
    }

    async initSubFilters(){
        for (let sub_filter_config of this.sub_filters_config){
            let new_sub_filter = new SubFilter(this.name, sub_filter_config);
            await new_sub_filter.initValues();
            this.addSubFilter(new_sub_filter);
        }
    }

    addSubFilter(subFilter){
        this.sub_filters.push(subFilter);
    }

    getSubFilters(){
        return this.sub_filters;
    }

    getSubFilter(name){
        return this.sub_filters.filter(sub_filter => sub_filter.name == name)[0];
    }

    getActiveSubFilters(){
        // ✅ دمج: subfilter active لو عنده values OR numeric filter enabled
        return this.sub_filters.filter(sub_filter => {
            if (sub_filter.isNumeric) {
                return sub_filter.isEnabled();
            }
            return sub_filter.getSelectedValues().length > 0;
        });
    }

    getInfos(){
        return this.infos;
    }

    async getSelectedFeatures(api_at, layer_name){
        let selected_features = [];
        let requestApiUrl = api_at + `/${layer_name}/${this.name}?`;

        for (let subfilter of this.getActiveSubFilters()){
            if (!subfilter.isNumeric){
                requestApiUrl += `&${subfilter.name}=${subfilter.getSelectedValues().join('|')}`;
            } else {
                // ✅ دمج: دعم floor/ceil date ranges بشكل سليم
                requestApiUrl += `&${subfilter.name}.floor=${subfilter.request_options.floor}|${subfilter.getFloor()}&${subfilter.name}.ceil=${subfilter.request_options.ceil}|${subfilter.getCeil()}`;
            }
        }

        console.log("Selection request to send:", requestApiUrl);
        let request_result = await fetch(requestApiUrl);
        let json_result = await request_result.json();
        for (let feature of json_result){
            selected_features.push(feature.id);
        }
        return selected_features;
    }
}
