# Zabbix plugin for Grafana

Forked from [alexanderzobnin's grafana-zabbix](https://github.com/alexanderzobnin/grafana-zabbix)
Fully feature description can be linked to that github.

This github repo added a new trigger event panel to support a trigger events table, especially for zabbix 3.2+ which has a new function to tag the infomation in trigger event. That function builds a new mechanism to use a same trigger for multiple problem events from monitor server/service.

Below graphics are the snapshots for the implemented trigger events table.

![grafana-event-panel](https://raw.githubusercontent.com/KasperDeng/kasperdeng.github.io/master/images/zabbix/grafana_event_panel.jpg)

![grafana-annotation](https://raw.githubusercontent.com/KasperDeng/kasperdeng.github.io/master/images/zabbix/grafana_annotation.jpg)
