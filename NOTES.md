## Oracles slow down

### How to revert

- /libs/oracle/src/lib/reportgen/reportgen.leader.service.ts: set `_timerRoundDurationMiliseconds`to 15 instead of 150
- /libs/oracle/src/lib/pacemaker/pacemaker.factory.service.ts: set `timerProgressDurationMiliseconds`to 30 instead of 300