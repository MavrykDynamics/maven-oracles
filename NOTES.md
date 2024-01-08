## Oracles slow down

### How to revert

- /libs/oracle/src/lib/reportgen/reportgen.leader.service.ts: set `_timerRoundDurationMiliseconds`to 15 instead of 900
- /libs/oracle/src/lib/pacemaker/pacemaker.factory.service.ts: set `timerProgressDurationMiliseconds`to 30 instead of 1800
- /libs/oracle/src/lib/pacemaker/__tests__/pacemaker.factory.service.test.ts: set `timerProgressDurationMiliseconds`to 30 instead of 1800
