<template>
  <div class="header">
    <map-svg-sprite-color />
    <search-controls
      @search="$emit('local-search', {term: $event});"
      @fetch-suggestions="$emit('fetch-suggestions', {data: $event});"
      :failedSearch="failedSearch"
    />

    <div v-if="syncMode" class="switch-control">
      <el-switch
        class="switch"
        v-model="independent"
        active-text="Independent"
        :width=30
        inactive-text="Linked">
      </el-switch>
      <el-popover
        class="tooltip"
        placement="bottom-end"
        :show-after="helpDelay"
        :teleported=false
        trigger="hover"
        popper-class="header-popper">
        <template #reference>
          <map-svg-icon icon="help" class="sync-help header-icon"/>
        </template>
        <template #default>
            When in Linked mode the two maps will interact
            <br>
            together. Select an organ in one and it will
            <br>
            be automatically selected in the other.
            <br>
            In Independent mode the maps will work separately."
        </template>
      </el-popover>
    </div>

    <el-row class="icon-group">
      <el-popover
        v-if="activeViewRef"
        :virtual-ref="activeViewRef"
        ref="viewPopover"
        placement="bottom"
        width="133"
        :teleported=false
        trigger="click"
        popper-class="view-icon-popover"
        virtual-triggering
        >
        <el-row :gutter="20"
          v-for="item in viewIcons"
          :key="item.name"
          :class="[{ 'active': item.icon ==  activeView},
            {'disabled': item.min > numberOfEntries},
            'view-icon-row']"
          @click="viewClicked(item.icon)"
        >
          <el-col :span="4">
            <map-svg-icon :icon="item.icon"
              class="view-icon"/>
          </el-col>
          <el-col :offset="2" :span="18" class="view-text">
            {{item.name}}
          </el-col>
        </el-row>
      </el-popover>
      <el-popover class="tooltip" content="Split screen" placement="bottom-end"
        :show-after="helpDelay" :teleported=false trigger="hover"
        popper-class="header-popper"
      >
        <template #reference>
          <map-svg-icon :icon="activeView"
          ref="activeViewRef"
          :class="[{'disabled': (1 >= numberOfEntries)},
            'header-icon']"
          />
        </template>
      </el-popover>

      <el-popover class="tooltip" content="Help" placement="bottom-end" :show-after="helpDelay"
        :teleported=false trigger="hover" popper-class="header-popper" >
        <template #reference>
          <map-svg-icon icon="tooltips" class="header-icon" @click="startHelp()"/>
        </template>
      </el-popover>
      <el-popover class="tooltip"
        content="Fullscreen" placement="bottom-end" :show-after="helpDelay"
        :teleported=false trigger="hover" popper-class="header-popper">
        <template #reference>
          <map-svg-icon v-show="!isFullscreen" icon="fullScreen" class="header-icon" @click="onFullscreen"/>
        </template>
      </el-popover>
      <el-popover class="tooltip"
        content="Exit fullscreen" placement="bottom-end" :show-after="helpDelay"
        :teleported=false trigger="hover" popper-class="header-popper">
        <template #reference>
          <map-svg-icon v-show="isFullscreen" icon="closeFullScreen" class="header-icon"
            @click="onFullscreen"/>
        </template>
      </el-popover>
      <el-popover
        v-if="permalinkRef"
        ref="linkPopover"
        :virtual-ref="permalinkRef"
        placement="bottom-end"
        width="400"
        :teleported=false
        trigger="click"
        popper-class="link-popover"
        virtual-triggering
      >
        <template v-if="displayShareOptions">
          <el-row>
            <el-col :offset="3" :span="8">
              <el-button
                type="primary"
                size="small"
                @click="getShareLink(exportAnnotation)"
                class="share-options"
              >
                Create Permalink
              </el-button>
            </el-col>
            <el-col :span="10">
              <el-popover class="tooltip"
                placement="bottom-end"
                :show-after="helpDelay" :teleported=false trigger="hover"
                popper-class="header-popper"
              >
                <template #reference>
                  <el-checkbox
                    v-model="exportAnnotation"
                    size="small"
                  >
                    Export Annotations
                  </el-checkbox>
                </template>
                <template #default>
                  Create a permalink with anonymous annotations.
                  <br>
                  NOTE: Annotations will only be stored for
                  <br>
                  30 days on the server.
                </template>
              </el-popover>
            </el-col>
        </el-row>
        </template>
        <template v-else>
          <el-row :gutter="20"
            v-loading="loadingLink"
            element-loading-text="Creating link...">
            <el-col :span="20">
              <el-input
                class="link-input"
                size="small"
                placeholder="Permanant Link Here"
                :readonly=true
                v-model="shareLink"
                ref="linkInput">
              </el-input>
            </el-col>
            <el-col :span="4">
              <el-popover class="tooltip" content="Copy link" placement="bottom-end"
                :show-after="helpDelay" :teleported=false trigger="hover"
                popper-class="header-popper">
                <template #reference>
                  <el-button class="copy-button"
                    :icon="ElIconCopyDocument" size="small"
                    @click="copyShareLink"></el-button>
                </template>
              </el-popover>
            </el-col>
          </el-row>
        </template>
      </el-popover>
      <el-popover class="tooltip"  content="Get permalink" placement="bottom-end"
        :show-after="helpDelay" :teleported=false trigger="hover"
        popper-class="header-popper"
        >
        <template #reference>
          <map-svg-icon icon="permalink"
            ref="permalinkRef"
            class="header-icon"
            @click="requestShareLink"
            v-show="shareLink"
          />
        </template>
      </el-popover>
      <el-popover class="tooltip" content="Close" placement="bottom-end" :show-after="helpDelay"
        :teleported=false trigger="hover" popper-class="header-popper">
        <template #reference>
          <map-svg-icon icon="close" class="header-icon" @click="close" v-show="showIcons"/>
        </template>
      </el-popover>
      <!--
      <el-popover
        v-if="globalSettingRef"
        :virtual-ref="globalSettingRef"
        ref="settingPopover"
        placement="bottom"
        width="133"
        :teleported=false
        trigger="click"
        popper-class="setting-popover"
        virtual-triggering
        >
        <el-row :gutter="20">
          <el-col :span="20">
            <el-checkbox
              v-model="globalSettings.displayMarkers"
              @change="updateGlobalSettings"
            >
              Display Map Markers
            </el-checkbox>
            <p>Card Hover</p>
            <el-checkbox
              v-model="globalSettings.highlightConnectedPaths"
              @change="updateGlobalSettings"
            >
              Highlight Connected Paths
            </el-checkbox>
            <el-checkbox
              v-model="globalSettings.highlightDOIPaths"
              @change="updateGlobalSettings"
            >
              Highlight DOI Paths
            </el-checkbox>
            <p>Interactive Mode</p>
            <el-radio-group
              v-model="globalSettings.interactiveMode"
              @change="updateGlobalSettings"
            >
              <el-radio value="dataset">Dataset Exploration</el-radio>
              <el-radio value="connectivity">Connectivity Exploration</el-radio>
              <el-radio value="multiscale">Multiscale Model</el-radio>
            </el-radio-group>
          </el-col>
        </el-row>
      </el-popover>
      <el-popover class="tooltip" content="Global Settings" placement="bottom-end"
        :show-after="helpDelay" :teleported=false trigger="hover"
        popper-class="header-popper"
      >
        <template #reference>
          <el-icon class="header-icon" ref="globalSettingRef">
            <el-icon-more-filled />
          </el-icon>
        </template>
      </el-popover>
      -->
    </el-row>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import { shallowRef } from 'vue';
import EventBus from './EventBus';
import { mapStores } from 'pinia';
import { useEntriesStore } from '../stores/entries';
import { useSettingsStore } from '../stores/settings';
import { useSplitFlowStore } from '../stores/splitFlow';
import { MapSvgIcon, MapSvgSpriteColor } from '@abi-software/svg-sprite';
import SearchControls from './SearchControls.vue';
import {
  CopyDocument as ElIconCopyDocument,
  MoreFilled as ElIconMoreFilled,
} from '@element-plus/icons-vue';
import {
  ElButton as Button,
  ElCheckbox as Checkbox,
  ElCol as Col,
  ElIcon as Icon,
  ElInput as Input,
  ElPopover as Popover,
  ElRadio as Radio,
  ElRadioGroup as RadioGroup,
  ElRow as Row,
  ElSwitch as Switch,
} from "element-plus";

/**
 * Cmponent for the header of differnt vuers.
 */
export default {
  name: "DialogToolbarContent",
  components: {
    Button,
    Checkbox,
    Col,
    Icon,
    Input,
    Popover,
    Radio,
    RadioGroup,
    Row,
    Switch,
    MapSvgIcon,
    MapSvgSpriteColor,
    SearchControls,
    ElIconCopyDocument,
  },
  props: {
    /**
     * Array of titles.
     */
    numberOfEntries: {
      type: Number,
      default: 0
    },
    /**
     * Display icons for docking, undocking and etc.
     */
    showIcons: {
      type: Boolean,
      default: false

    },
  },
  computed: {
    ...mapStores(useEntriesStore, useSettingsStore, useSplitFlowStore),
    activeView() {
      return this.splitFlowStore.activeView;
    },
    helpDelay() {
      return this.settingsStore.helpDelay;
    },
    shareLink() {
      return this.settingsStore.shareLink;
    },
    syncMode() {
      return this.splitFlowStore.syncMode;
    },
    viewIcons() {
      return this.splitFlowStore.viewIcons;
    },
    globalCallback() {
      return this.splitFlowStore.globalCallback;
    }
  },
  watch: {
    shareLink: function() {
      this.loadingLink = false;
    },
    independent: function(value) {
      let flag = !(value === true);
      if (this.globalCallback !== flag)
        this.splitFlowStore.toggleGlobalCallback(flag);
    },
    globalCallback: function(value) {
      let flag = !(value === true);
      if (flag !== this.independent)
        this.independent = flag;
    },
  },
  data: function() {
    return {
      activeViewRef: undefined,
      displayShareOptions: false,
      ElIconCopyDocument: shallowRef(ElIconCopyDocument),
      exportAnnotation: false,
      failedSearch: undefined,
      globalSettings: {},
      globalSettingRef: undefined,
      independent: true,
      isFullscreen: false,
      loadingLink: true,
      permalinkRef: undefined,
    }
  },
  methods: {
    loadGlobalSettings: function () {
      this.globalSettings = {
        ...this.globalSettings,
        ...this.settingsStore.globalSettings
      };
    },
    /**
    updateGlobalSettings: function() {
      const updatedSettings = this.settingsStore.getUpdatedGlobalSettingsKey(this.globalSettings);
      this.settingsStore.updateGlobalSettings(this.globalSettings);

      // display marker update
      if (updatedSettings.includes('displayMarkers')) {
        EventBus.emit('markerUpdate');
      }
      if (updatedSettings.includes('interactiveMode')) {
        EventBus.emit('modeUpdate', this.globalSettings.interactiveMode);
      }
    },
    */
    titleClicked: function(id) {
      this.$emit("titleClicked", id);
    },
    startHelp: function(){
      EventBus.emit("startHelp");
    },
    onFullscreen: function() {
      this.$emit("onFullscreen");
      this.isFullscreen = !this.isFullscreen;
    },
    onFullscreenEsc: function () {
      if (!document.fullscreenElement) {
        this.isFullscreen = false;
      }
    },
    close: function() {
      this.$emit("close");
    },
    copyShareLink: function() {
      if (document) {
        this.$refs.linkInput.$el.querySelector("input").select();
        document.execCommand('copy');
      }
    },
    setFailedSearch: function(result) {
      this.failedSearch = result;
    },
    requestShareLink: function() {
      if (sessionStorage.getItem('anonymous-annotation')) {
        this.displayShareOptions = true;
      } else {
        this.getShareLink(false);
      }
    },
    getShareLink: function(withAnnotation) {
      this.displayShareOptions = false;
      this.loadingLink = true;
      EventBus.emit("updateShareLinkRequested", withAnnotation);
    },
    viewClicked: function(view) {
      this.splitFlowStore.updateActiveView({
        view,
        entries: this.entriesStore.entries,
      });

      if (this.$refs.viewPopover) {
        this.$refs.viewPopover.hide();
      }
    }
  },
  mounted: function () {
    this.activeViewRef = shallowRef(this.$refs.activeViewRef);
    this.permalinkRef = shallowRef(this.$refs.permalinkRef);
    this.globalSettingRef = shallowRef(this.$refs.globalSettingRef);

    document.addEventListener('fullscreenchange', this.onFullscreenEsc);

    this.loadGlobalSettings();
  },
  unmounted: function () {
    document.removeEventListener('fullscreenchange', this.onFullscreenEsc);
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@use "../assets/header-icon.scss";

.icon-group {
  :deep(.el-button--text) {
    color:#606266;
    font-size: 1.5em;
    &:hover {
      color: $app-primary-color;
    }
  }
}

.icon-transform {
  -moz-transform: rotate(90deg);
  -webkit-transform: rotate(90deg);
  -o-transform: rotate(90deg);
  -ms-transform: rotate(90deg);
  transform: rotate(90deg);
  padding:10px;
}

.header {
  height:32px;
}

.share-options.el-button {
  font-family: inherit;

  &:hover,
  &:focus {
    background: $app-primary-color;
    box-shadow: -3px 2px 4px #00000040;
    color: #fff;
  }
}

:deep(.header-popper.el-popover.el-popper) {
  padding: 6px 4px;
  font-size:12px;
  color: rgb(48, 49, 51);
  background-color: #f3ecf6;
  border: 1px solid $app-primary-color;
  white-space: nowrap;
  min-width: unset;

  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #f3ecf6;
    }
  }
}

:deep(.link-popover) {
  border: 1px solid $app-primary-color;
}

:deep(.el-loading-spinner) {
  .path {
    stroke: $app-primary-color;
  }
  .el-loading-text {
    color: $app-primary-color;
  }
}

.copy-button {
  color:#FFFFFF;
  background-color:$app-primary-color;
  &:hover, &:focus {
    color:#FFFFFF;
    background-color:$app-primary-color;
    box-shadow: -3px 2px 4px #000000;
  }
}

.link-input {
  :deep(.el-input__inner) {
    color:#303133;
    &:focus {
      border-color:$app-primary-color;
    }
  }
}

.view-icon-row {
  height: 32px;
  width: 133px;
  border-radius: 4px;
  border: 1px solid rgb(151, 151, 151);
  font-size: 14px;
  margin:8px 0px 0px 0px!important;
  cursor: pointer;

  &.active {
    border: 1px solid $app-primary-color;
    background: rgba(131, 0, 191, 0.1);
  }
}

.view-icon {
  font-size: 1.7em;
  height: 24px!important;
  width: 24px!important;
  color: $app-primary-color;
  padding-top:3px;
}

.view-text {
  letter-spacing:0px;
  font-size:11px;
  line-height:14px;
  font-family:'Asap', 'Avenir',  Arial, sans-serif;
  font-weight:550;
  padding-top:7px;
}

:deep(.view-icon-popover.el-popper), 
:deep(.setting-popover.el-popper ) {
  border: 1px solid $app-primary-color;
  box-shadow: 0px 2px 12px 0px rgba(0, 0, 0, 0.06);
  padding: 4px 8px 12px 8px;
  min-width:unset!important;
  width:unset!important;
  background-color: #f3ecf6;
  cursor:default;
  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #f3ecf6;
    }
  }
}

.switch-control {
  width:250px;
  top:2px;
  left: calc(50% - 60px);
  position: absolute;
  display: flex;
  align-items: center;

  .sync-help {
    left:5px;
    stroke: $app-primary-color;
  }
}

.switch {
  padding-right: 0.5rem;
  padding-left: 0.5rem;
  border-radius: 4px;
  border: 1px solid rgb(220, 223, 230);
  vertical-align: super;
  height: 28px;
  box-sizing: border-box;
}

.sync-help {
  margin-left: 5px;
}

:deep(.el-loading-spinner) {
  top: 0px;
  scale: 0.7;
}
</style>