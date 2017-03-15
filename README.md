# Zabbix Trigger-Event-Panel for Grafana

Forked from [alexanderzobnin's grafana-zabbix](https://github.com/alexanderzobnin/grafana-zabbix). Original feature description can be found there.

## New in this github repo ##
zabbix 3.2+ provides a new function to tag the infomation in trigger event. That function builds a new mechanism to use a same trigger for multiple problem events from monitor server/service.
This github repo add a trigger events table in a trigger-event-panel to show the trigger event information based on the custom [event tags](https://www.zabbix.com/documentation/3.2/manual/config/triggers/event_tags?s[]=tags) defined in zabbix trigger configuration.

![Event Tags Example](https://www.zabbix.com/documentation/3.2/_media/manual/config/triggers/event_tags.png)

### Usage ###
For who fork this sub-project, please update the event tags constant definition in the `src\panel-events\module.js` to align your custom tag definition in zabbix.
Minor adaptation in the method `refreshData()` might be needed.

### Screenshot ###

![grafana-event-panel](https://raw.githubusercontent.com/KasperDeng/kasperdeng.github.io/master/images/zabbix/grafana_event_panel.jpg)

![grafana-annotation](https://raw.githubusercontent.com/KasperDeng/kasperdeng.github.io/master/images/zabbix/grafana_annotation.jpg)
