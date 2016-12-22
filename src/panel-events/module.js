/**
 * Grafana-Zabbix
 * Zabbix plugin for Grafana.
 * http://github.com/alexanderzobnin/grafana-zabbix
 *
 * Trigger Event panel.
 * This feature initiated by Kasper Deng in Ericsson CGC
 * and based on Alexander Zobnin's zabbix trigger panel.
 *
 * Copyright 2016 Alexander Zobnin alexanderzobnin@gmail.com
 * Licensed under the Apache License, Version 2.0
 */

import _ from 'lodash';
import moment from 'moment';
import * as utils from '../datasource-zabbix/utils';
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import {eventPanelEditor} from './editor';
import './ack-tooltip.directive';
import './css/panel_events.css!';


var eventStatusMap = {
  '0': 'OK',
  '1': 'Problem'
};

var eventSeverityMap = {
  '0': 'NA',
  '1': 'Cleared',
  '2': 'Indeterminate',
  '3': 'Critical',
  '4': 'Major',
  '5': 'Minor',
  '6': 'Warning'
};

var defaultSeverity = [
  { priority: 1, severity: 'Cleared',        color: '#82B5D8', show: true },
  { priority: 2, severity: 'Indeterminate',  color: '#B7DBAB', show: true },
  { priority: 3, severity: 'Critical',       color: '#890F02', show: true },
  { priority: 4, severity: 'Major',          color: '#BF1B00', show: true },
  { priority: 5, severity: 'Minor',          color: '#C15C17', show: true },
  { priority: 6, severity: 'Warning',        color: '#E5AC0E', show: true },
];

var panelDefaults = {
  datasource: null,
  triggers: {
    group: {filter: ""},
    host: {filter: ""},
    application: {filter: ""},
    trigger: {filter: ""}
  },
  eventIdField: true,
  hostField: true,
  statusField: true,
  severityField: true,
  resolvedStatusField: true,
  timestampField: true,
  ageField: true,
  infoField: true,
  limit: 50,
  beforeDays: 2,
  showTriggers: 'all triggers',
  sortTriggersBy: { text: 'age-asc', value: 'age-asc' },
  showEvents: { text: 'Problems', value: '1' },
  eventSeverity: defaultSeverity,
  okEventColor: 'rgba(0, 245, 153, 0.45)',
  ackEventColor: 'rgba(0, 0, 0, 0)'
};

var defaultTimeFormat = "DD MMM YYYY HH:mm:ss";

class EventPanelCtrl extends MetricsPanelCtrl {

  /** @ngInject */
  constructor($scope, $injector, $element, datasourceSrv, templateSrv, contextSrv) {
    super($scope, $injector);
    this.datasourceSrv = datasourceSrv;
    this.templateSrv = templateSrv;
    this.contextSrv = contextSrv;
    this.eventStatusMap = eventStatusMap;
    this.eventSeverityMap = eventSeverityMap;
    this.defaultTimeFormat = defaultTimeFormat;

    // Load panel defaults
    // _.cloneDeep() need for prevent changing shared defaultSeverity.
    // Load object "by value" istead "by reference".
    _.defaults(this.panel, _.cloneDeep(panelDefaults));

    this.eventList = [];
    this.refreshData();
  }

  /**
   * Override onInitMetricsPanelEditMode() method from MetricsPanelCtrl.
   * We don't need metric editor from Metrics Panel.
   */
  onInitMetricsPanelEditMode() {
    this.addEditorTab('Options', eventPanelEditor, 2);
  }

  refresh() {
    this.onMetricsPanelRefresh();
  }

  onMetricsPanelRefresh() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode()) { return; }

    this.refreshData();
  }

  _getEventTagValue(event, key) {
    let tagObj = "";
    tagObj = _.find(event.tags, function(o) { return o.tag === key; });
    if (!!tagObj) {
      return tagObj.value;
    }
    return null;
  }

  refreshData() {
    // clear loading/error state
    delete this.error;
    this.loading = true;
    this.setTimeQueryStart();

    var self = this;

    // Load datasource
    return this.datasourceSrv.get(this.panel.datasource)
    .then(datasource => {
      var zabbix = datasource.zabbix;
      var showEvents = self.panel.showEvents.value;
      var hideAcknowledged = self.panel.hideAcknowledged;
      var triggerFilter = self.panel.triggers;

      // Replace template variables
      var groupFilter = datasource.replaceTemplateVars(triggerFilter.group.filter);
      var hostFilter = datasource.replaceTemplateVars(triggerFilter.host.filter);
      var appFilter = datasource.replaceTemplateVars(triggerFilter.application.filter);

      var getTriggers = zabbix.getTriggers(groupFilter, hostFilter, appFilter, showEvents);
      return getTriggers.then(triggerList => {

        // Request events for trigger
        return _.map(triggerList, trigger => {
          let triggerid = trigger.triggerid;
          let daysBefore = self.panel.beforeDays;
          let timeTo = Math.ceil(Date.parse(new Date())/1000);
          let timeFrom = timeTo - (daysBefore * 24 * 3600);
          var getEvents = zabbix.getEvents(triggerid, timeFrom, timeTo, showEvents);
          return getEvents.then(eventList => {
            return _.map(eventList, event => {
              let eventObj = event;
              //eventObj.host = _.map(event.hosts, 'name');
              eventObj.host = self._getEventTagValue(event, 'Host');
              /*if (eventObj.host === null) {
                eventObj.host = event.hosts[0].name;
              }*/
              eventObj.severity = self._getEventTagValue(event, 'Severity');

              if (event.r_eventid !== "0") {
                eventObj.resolvedStatus = "Yes by " + event.r_eventid;
                eventObj.color = self.panel.okEventColor;
              } else {
                eventObj.resolvedStatus = "No";
                eventObj.color = self.panel.eventSeverity[eventObj.severity - 1].color;
              }

              let statusEvent = self._getEventTagValue(event, 'StatusEvent');
              if (!!statusEvent) { //&& statusEvent === "Status Active Alarm Events"
                eventObj.problem = self._getEventTagValue(event, 'Problem');
              }
              eventObj.module = self._getEventTagValue(event, 'Module');
              eventObj.errorCode = self._getEventTagValue(event, 'ErrorCode');
              eventObj.resourceId = self._getEventTagValue(event, 'ResourceId');
              eventObj.tags = _.map(event.tags, 'value');
              eventObj.time = new Date(event.clock * 1000);
              let elapseSec = (Date.parse(new Date())/1000 - event.clock);
              if (elapseSec >= 86400) {
                eventObj.age = Math.ceil((elapseSec/86400)) + " days";
              } else if (elapseSec >= 3600) {
                eventObj.age = Math.ceil((elapseSec/3600)) + " hrs";
              } else if (elapseSec >= 60) {
                eventObj.age = Math.ceil((elapseSec/60)) + " mins";
              } else {
                eventObj.age = Math.ceil(elapseSec) + " secs";
              }

              eventObj.acknowledges = _.map(event.acknowledges, ack => {
                let timestamp = moment.unix(ack.clock);
                if (self.panel.customLastChangeFormat) {
                  ack.time = timestamp.format(self.panel.lastChangeFormat);
                } else {
                  ack.time = timestamp.format(self.defaultTimeFormat);
                }
                ack.user = ack.alias + ' (' + ack.name + ' ' + ack.surname + ')';
                return ack;
              });

              // Mark acknowledged triggers with different color
              if (self.panel.markAckEvents && event.acknowledges.length) {
                trigger.color = self.panel.ackEventColor;
              }

              return eventObj;
            });
          }).then(eventList => {
            eventList = _.filter(eventList, event => {
              if (event.tags.length === 8) { // TODO currently hardcode
                return event;
              }
            });

            //TODO filter by severity
            /*var triggerFilter = self.panel.triggers.trigger.filter;
            if (triggerFilter) {
              triggerList = filterTriggers(triggerList, triggerFilter);
            }*/

            //TODO filter by not resolved

            // Sort events
            if (self.panel.sortEventsBy.value === 'priority') {
              eventList = _.sortBy(eventList, 'priority').reverse();
            } else if (self.panel.sortEventsBy.value === 'age-dsc') {
              eventList = _.sortBy(eventList, 'age').reverse();
            } else if (self.panel.sortEventsBy.value === 'age-asc') {
              eventList = _.sortBy(eventList, 'age');
            }

            // Limit events number
            self.eventList  = eventList.slice(0, self.panel.limit);

            // Notify panel that request is finished
            self.setTimeQueryEnd();
            self.loading = false;
          });
        });
      });
    });
  }

  switchComment(trigger) {
    trigger.showComment = !trigger.showComment;
  }

  acknowledgeTrigger(trigger, message) {
    let self = this;
    let eventid = trigger.lastEvent.eventid;
    let grafana_user = this.contextSrv.user.name;
    let ack_message = grafana_user + ' (Grafana): ' + message;
    return this.datasourceSrv.get(this.panel.datasource).then(datasource => {
      let zabbix = datasource.zabbixAPI;
      return zabbix.acknowledgeEvent(eventid, ack_message).then(() => {
        self.refresh();
      });
    });
  }
}

EventPanelCtrl.templateUrl = 'panel-events/module.html';

function filterTriggers(triggers, triggerFilter) {
  if (utils.isRegex(triggerFilter)) {
    return _.filter(triggers, function(trigger) {
      return utils.buildRegex(triggerFilter).test(trigger.description);
    });
  } else {
    return _.filter(triggers, function(trigger) {
      return trigger.description === triggerFilter;
    });
  }
}

export {
  EventPanelCtrl,
  EventPanelCtrl as PanelCtrl
};
