<template>
  <div class="tab-container" ref="tabContainer">
    <custom-splitter
      index="split-1"
      key="split-1"
    />
    <div
      v-for="entry in entries"
      :key="entry.id"
      :style="getStyle(entry.id)"
      :class="[getClass(entry.id), 'contentvuer']"
    >
      <ContentVuer
        :key="entry.id"
        :entry="entry"
        ref="content"
        @resource-selected="resourceSelected"
        @species-changed="speciesChanged"
        :visible="isIdVisible(entry.id)"
      />
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import ContentVuer from "./ContentVuer.vue";
import CustomSplitter from "./CustomSplitter.vue";
import EventBus from './EventBus';
import { mapStores } from 'pinia';
import { useSplitFlowStore } from '../stores/splitFlow';
import { useSettingsStore } from '../stores/settings';
import { useConnectivitiesStore } from '../stores/connectivities';
import {
  queryPathsByRoute,
  queryAllConnectedPaths,
} from "@abi-software/map-utilities";

export default {
  name: "SplitDialog",
  components: {
    ContentVuer,
    CustomSplitter,
  },
  props: {
    entries: {
      type: Array,
      default: function() {
        return [];
      }
    }
  },
  data: function() {
    return {
      styles: { },
      query: "",
      filter: [],
    }
  },
  methods: {
    /**
     * Callback when the vuers emit a selected event.
     */
    resourceSelected: function(result) {
      this.$emit("resource-selected", result);
    },
    speciesChanged: function (species) {
      this.$emit("species-changed", species);
    },
    getClass: function(id) {
      if (this.isIdVisible(id)) {
        return this.getRefsName(id);
      } else {
        return "inactive";
      }
    },
    getRefsName: function(id) {
      const refName = this.splitFlowStore.getPaneNameById(id);
      if (refName) {
        if (!(refName in this.styles)) {
          this.styles[refName] = {};
        }
      }
      return refName;
    },
    getStyle: function(id) {
      /*
        Set the style based on the position of the spltters
        Header is 30px in height and the splitter is 1px in
        height/width. The width, height and positon of the
        viewer should take that into account.
      */
      const refName = this.getRefsName(id);
      if (refName && refName in this.styles && this.styles[refName]) {
        return this.styles[refName];
      }
      return {};
    },
    getActiveContents: function() {
      const activeContents = [];
      const vuers = this.$refs['content'];
      if (vuers) {
        vuers.forEach(vuer => {
          if (vuer.isVisible())
            activeContents.push(vuer);
        });
      }
      return activeContents;
    },
    isIdVisible: function(id) {
      const refName = this.splitFlowStore.getPaneNameById(id);
      return refName !== undefined;
    },
    getContentsWithId: function(id) {
      let contents = this.$refs["content"];
      for (let i = 0; i < contents.length; i++) {
        if (contents[i].getId() == id) {
          return contents[i];
        }
      }
      return undefined;
    },
    getContentsState: function() {
      let states = [];
      let contents = this.$refs["content"];
      for (let i = 0; i < contents.length; i++) {
        states.push(contents[i].getState());
      }
      return states;
    },
    setStyles: function(refName, rect) {
      if (this.$refs && this.$refs.tabContainer) {
        const bound = this.$refs.tabContainer.getBoundingClientRect();
        const style = {};
        style["width"] = `${rect.width}px`;
        style["left"] = `${rect.left - bound.left}px`;
        style["height"] = `${rect.height}px`;
        style["top"] = `${rect.top - bound.top}px`;
        style["display"] = "block";
        this.styles[refName] = style;
      }
    },
    hidePane: function(refName) {
      if (this.$refs && ('tabContainer' in this.$refs)) {
        const style = {};
        style["display"] = "none";
        this.styles[refName] = style;
      }
    },
    resize: function() {
      this.__userResize__ = true;
    },
    resized: function(splitterName, event) {
      if (this.__userResize__) {
        this.splitFlowStore.setSplitter({
          name: splitterName,
          value: event[0].size
        });
      }
      this.__userResize__ = false;
    },
    onSpeciesLayoutConnectivityUpdate: function () {
      let activePaneIDs = this.splitFlowStore.getActivePaneIds();
      // body scaffold id may be a string depends on situation
      const wholeBodyScaffoldIDs = [307, '307'];
      const sckanVersion = Object.keys(this.connectivitiesStore.globalConnectivities)
        .find(key => key.includes('sckan'));
      const uuids = Array.from(
        new Set(
          this.entries
            .filter((entry) => {
              return (
                activePaneIDs.includes(entry.id) &&
                (
                  (
                    entry.uuid &&
                    (entry.type === 'Flatmap' || entry.type === 'MultiFlatmap')
                  ) ||
                  (
                    entry.type === 'Scaffold' && entry.resource &&
                    (entry.isBodyScaffold || wholeBodyScaffoldIDs.includes(entry.discoverId))
                  )
                )
              )
            })
            .map((entry) => {
              if ((entry.type === 'Flatmap' || entry.type === 'MultiFlatmap')) {
                return entry.uuid;
              } else if (entry.type === 'Scaffold') {
                return entry.resource;
              }
            })
        )
      );

      // mix connectivites of available maps
      if (uuids.length) {
        this.connectivitiesStore.updateActiveConnectivityKeys(uuids);

        const uniqueConnectivities = this.connectivitiesStore.getUniqueConnectivitiesByKeys;
        EventBus.emit("connectivity-knowledge", {
          data: uniqueConnectivities,
          highlight: [],
          processed: false
        });

        const uniqueFilters = this.connectivitiesStore.getUniqueFilterOptionsByKeys;
        EventBus.emit("connectivity-filter-options", uniqueFilters);
      } else {
        EventBus.emit("connectivity-knowledge", {
            data: this.connectivitiesStore.globalConnectivities[sckanVersion],
            highlight: [],
            processed: false,
        });
        EventBus.emit("connectivity-filter-options", []);
        this.connectivitiesStore.updateActiveConnectivityKeys([sckanVersion]);
      }
    },
    getGeneralSearchedId: function (entry, term, type = 'query') {
      const ids = [];
      entry.forEach((data) => {
        let compareRanges = [
          JSON.stringify(data['nerve-label'])
        ];
        if (type = 'query') {
          compareRanges = [
            ...compareRanges,
            data.id,
            data.label,
            data['long-label'],
            JSON.stringify(data['nerves'])
          ]
        }
        const isMatched = compareRanges.some((data) => {
          return data?.toLowerCase().includes(term.toLowerCase())
        });
        if (isMatched && !ids.includes(data.id)) {
          ids.push(data.id);
        }
      });
      return ids;
    },
    getFlatmapSearchedId: function (flatmap, term) {
      const ids = [];
      const searchResult = flatmap.mapImp.search(term);
      const featureIds = searchResult.__featureIds || searchResult.featureIds;
      featureIds.forEach((id) => {
        const annotation = flatmap.mapImp.annotation(id);
        const compareRanges = [
          annotation.id,
          annotation.name,
          annotation.label,
          annotation.models,
          annotation.source
        ];
        const isMatched = compareRanges.some((item) => {
          return item && item.toLowerCase().includes(term.toLowerCase())
        });
        if (isMatched && annotation.models && !ids.includes(annotation.models)) {
          ids.push(annotation.models);
        }
      });
      return ids;
    },
    connectivityQueryFilter: async function (data) {
      this.query = "";
      this.filter = [];
      const activeContents = this.getActiveContents();
      const flatmapAPI = this.settingsStore.flatmapAPI;
      const searchOrders = [], searchResults = [];
      let searchHighlights = [];
      let processed = false;
      let queryIds = [], facetIds = [];
      let sourceId = "";

      const uniqueFilters = this.connectivitiesStore.getUniqueFilterOptionsByKeys;
      const uniqueFilterSources = this.connectivitiesStore.getUniqueFilterSourcesByKeys;
      let results = this.connectivitiesStore.getUniqueConnectivitiesByKeys;

      for (const activeContent of activeContents) {
        const viewer = activeContent.$refs.viewer;
        if (viewer) {
          const multiflatmap = viewer.$refs.multiflatmap;
          const flatmap = viewer.$refs.flatmap;
          const scaffold = viewer.$refs.scaffold;
          const iframe = viewer.$refs.iframe;
          const plot = viewer.$refs.plot;
          const simulation = viewer.$refs.simulation;
          let currentMap = null;
          if (multiflatmap) {
            const _currentMap = multiflatmap.getCurrentFlatmap();
            if (_currentMap && _currentMap.mapImp) {
              currentMap = _currentMap;
              sourceId = currentMap.mapImp.uuid;
            }
          } else if (flatmap && flatmap.mapImp) {
            currentMap = flatmap;
            sourceId = currentMap.mapImp.uuid;
          } else {
            currentMap = scaffold || iframe || plot || simulation;
          }
        
          const isFlatmap = flatmap || multiflatmap;
          if (data) {
            this.query = data.query;
            // get query search result ids and order
            if (data.query) {
              const searchTerms = this.query
                .replace(/["']/g, "")
                .split(",")
                .map(term => term.trim())
                .filter(term => term);
              const nestedIds = [];
              for (let index = 0; index < searchTerms.length; index++) {
                isFlatmap ?
                  nestedIds.push(this.getFlatmapSearchedId(currentMap, searchTerms[index])) :
                  nestedIds.push(this.getGeneralSearchedId(results, searchTerms[index]), 'query');
              }
              // within query search (split terms by comma) -> OR
              const flatIds = [...new Set(nestedIds.flat())];
              searchOrders.push(...flatIds);
              const ids = isFlatmap ? await queryAllConnectedPaths(flatmapAPI, sourceId, flatIds) : flatIds;
              queryIds.push(...ids);
            }

            const connectivityQueries = {
              origins: [],
              vias: [],
              destinations: [],
              all: [],
            };

            let filters = {};
            // get facet search result ids
            data.filter.forEach((item) => {
              const facetKey = item.facetPropPath.split('.').pop();;
              if (scaffold) {
                if (item.facet !== 'Show all') {
                  if (!(facetKey in filters)) {
                    filters[facetKey] = [];
                  }
                  // within facet search category -> OR
                  filters[facetKey].push(...this.getGeneralSearchedId(results, item.facet, 'facet'));
                }
              } else if (isFlatmap) {
                const isNeuronConnection = item.facetPropPath.includes('flatmap.connectivity.source');
                // origins/vias/destinations/all filter logic
                // generate connectivityQueries to query related ids
                if (isNeuronConnection) {
                  if (item.facet?.toLowerCase() !== 'show all') {
                    // string format with a space for CQ
                    const feature = item.facet.replace(",\[", ", \[");
                    const mode = item.facetPropPath.split('.').pop();
  
                    if (mode === 'origin') {
                      connectivityQueries.origins.push(feature);
                    } else if (mode === 'destination') {
                      connectivityQueries.destinations.push(feature);
                    } else if (mode === 'via') {
                      connectivityQueries.vias.push(feature);
                    } else {
                      const featuresArray = JSON.parse(feature).flat(Infinity);
                      connectivityQueries.all.push(...featuresArray);
                    }
                  }
                } else {
                  // all other flatmap filter logic
                  const matchedFilter = uniqueFilters.find(filter => filter.key.includes(facetKey));
                  if (matchedFilter) {
                    matchedFilter.children.forEach((child) => {
                      if (child.label === item.facet && child.key) {
                        const childKey = child.key.split('.').pop();
                        if (!(facetKey in filters)) {
                          filters[facetKey] = [];
                        }
                        // within facet search category -> OR
                        filters[facetKey].push(...uniqueFilterSources[facetKey][childKey]);
                      }
                    });
                  }
                }
              }
            });

            // query ids for origins/vias/destinations/all filter
            if (
              connectivityQueries.origins.length ||
              connectivityQueries.destinations.length ||
              connectivityQueries.vias.length
            ) {
              const options = {
                flatmapAPI: flatmapAPI,
                knowledgeSource: sourceId,
                origins: connectivityQueries.origins,
                destinations: connectivityQueries.destinations,
                vias: connectivityQueries.vias,
              };
              // expectation
              // result should already applied the following
              // between origins, destinations and vias -> AND
              // within origins, destinations and vias -> OR
              if (!('ovd' in filters)) {
                filters['ovd'] = [];
              }
              filters['ovd'].push(...await queryPathsByRoute(options));
            } else if (connectivityQueries.all.length) {
              if (!('all' in filters)) {
                filters['all'] = [];
              }
              filters['all'].push(...await queryAllConnectedPaths(flatmapAPI, sourceId, connectivityQueries.all));
            }

            const nestedIds = Object.values(filters);
            this.filter = [...this.filter, ...nestedIds];
            // between facet search categories -> AND
            const ids = this.filter.length ? this.filter.reduce((acc, curr) => acc.filter(id => curr.includes(id))) : [];
            facetIds.push(...ids);
          }
        }
      }

      let target;
      if (this.query && !this.filter.length) { // pure query search
        target = queryIds;
      } else if (!this.query && this.filter.length) { // pure facet search
        target = facetIds;
      } else if (this.query && this.filter.length) { // combined query and facet search
        // between query search and facet search -> AND 
        target = queryIds.filter(id => facetIds.includes(id));
      }
      // This can be empty array due to the AND operation
      if (target) {
        searchHighlights.push(...target);
        results = results.filter((item) => target.includes(item.id));
        processed = true;
      }
      searchResults.push(...results);

      const uniqueOrders = [...new Set(searchOrders)];
      const uniqueHighlights = [...new Set(searchHighlights)];
      let uniqueResults = Array.from(
        new Map(searchResults.map((item) => [item.id, item])).values()
      );
      // Ensure that the results always show search items first
      // and the rest ordered by alphabetical order
      uniqueResults = [
        ...uniqueResults.filter((r) => uniqueOrders.includes(r.id)),
        ...uniqueResults.filter((r) => !uniqueOrders.includes(r.id))
      ];

      const connectivitiesPayload = {
        data: uniqueResults,
        highlight: uniqueHighlights,
        processed: processed
      };

      EventBus.emit("connectivity-knowledge", connectivitiesPayload);
    },
  },
  computed: {
    ...mapStores(useSplitFlowStore, useConnectivitiesStore, useSettingsStore),
    horizontal() {
      if (this.splitFlowStore.activeView === "2horpanel") {
        return true;
      }
      return false;
    },
    splitters() {
      return this.splitFlowStore.splitters;
    },
  },
  mounted: function () {
    EventBus.on("PaneResize", payload => {
      this.setStyles(payload.refName, payload.rect);
    });
    EventBus.on("PaneUnmounted", payload => {
      this.hidePane(payload.refName);
    });
    EventBus.on('species-layout-connectivity-update', () => {
      this.onSpeciesLayoutConnectivityUpdate();
    })
    EventBus.on("connectivity-query-filter", (payload) => {
      this.connectivityQueryFilter(payload);
    });
    //The followings are migrated from ContentVuer and its child components to here
    EventBus.on("hoverUpdate", (payload) => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onHoverUpdate(payload);
      });
    });
    EventBus.on("startHelp", () => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onStartHelp();
      });
    });
    EventBus.on('connectivity-item-close', () => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onConnectivityItemClose();
      });
    });
    EventBus.on('sidebar-annotation-close', () => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onSidebarAnnotationClose();
      });
    });
    EventBus.on('globalViewerSettingsUpdate', () => {
      const contents = this.$refs['content'];
      contents.forEach((content) => {
        content.onGlobalViewerSettingsUpdate();
      });
    });
    EventBus.on("markerUpdate", () => {
      const contents = this.$refs['content'];
      contents.forEach((content) => {
        content.onFlatmapMarkerUpdate();
      });
    });
    EventBus.on('connectivity-hovered', (payload) => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onShowConnectivityTooltips(payload);
      });
    });
    EventBus.on('connectivity-source-change', (payload) => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onConnectivitySourceChange(payload);
      });
    });
    EventBus.on('show-connectivity', (payload) => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onShowConnectivity(payload);
      });
    });
    EventBus.on('show-reference-connectivities', (payload) => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onShowReferenceConnectivity(payload);
      });
    });
    EventBus.on('filter-visibility', (payload) => {
      const contents = this.getActiveContents();
      contents.forEach((content) => {
        content.onFilterVisibility(payload);
      });
    });
  },
};
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
:deep(.splitpanes.default-theme .splitpanes__pane) {
  background-color: #ccc !important;
  position: relative;
}

:deep(.splitpanes__splitter) {
  margin: 0px 0px 0px 0px !important;
  z-index: 6 !important;
  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    transition: opacity 0.4s;
    background-color: rgba(131, 0, 191, 0.3) !important;
    opacity: 0;
    z-index: 7 !important;
    &:hover {
      opacity: 1;
    }
  }
}

:deep(.splitpanes--horizontal > .splitpanes__splitter),
:deep(.splitpanes--vertical > .splitpanes__splitter) {
  background-color: #ccc !important;
  border-left: unset;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 1px;
  &::before {
    top: -2px;
    height: 10px;
    width: 100%;
  }
}

:deep(.splitpanes--vertical > .splitpanes__splitter) {
  width: 1px;
  &::before {
    left: -3px;
    width: 11px;
    height: 100%;
  }
}

.tab-container {
  position: absolute;
  width: 100% !important;
  height: 100% !important;
  left: 0px !important;
  top: 0px !important;
}

.button-group {
  position: absolute;
  top: 1%;
  right: 1%;
}

.contentvuer {
  position: absolute;
  transition: all 1s ease;
  background: rgba(255, 255, 255, 1);

  &.inactive {
    display: none;
    width: 0%;
    height: 0%;
    left: 0px;
    top: 30px;
  }
}
</style>
