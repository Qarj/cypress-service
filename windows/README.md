# Server Installation

Python 3.7 or higher required
nodejs and npm required
handle64.exe at least version 4.22 must be in path

Run all the cmds under `Stop tracking files` section below

Can test that port 4567 is open by running a Python one-liner

```
python -m http.server 4567
```

## Windows Task Scheduler: "Cypress_Install"

```
cmd /c d:\cypress-service\windows\cypress_install.bat
```

## Windows Task Scheduler: "Cypress_Start"

```
cmd /c python d:\cypress-service\windows\cypress_start.py
```

Create a trigger for the task

```
Settings: Daily
Start: 00:00:01
Recur every: 1 days
Repeat task every: 5 minutes for a duration of 1 day
```

## Windows Task Scheduler: "Cypress_Stop"

```
cmd /c python d:\cypress-service\windows\cypress_stop.py
```

# Windows Server Status

Check if server running

```
netstat -ano | findstr :4567
```

Kill Server

```
taskkill /PID <PID> /F
```

See what is locking `server.log`

```
handle64 server.log /accepteula
```

Unlock `server.log`

```
TASKKILL /F /IM node.exe /T
```
