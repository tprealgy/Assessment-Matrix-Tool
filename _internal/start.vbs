
' This script starts the Node.js server in the background and opens the application in the default browser.

Set WshShell = CreateObject("WScript.Shell")

' Kill any process using port 3000 to prevent conflicts
WshShell.Run "cmd /c netstat -ano | findstr :3000 | for /f ""tokens=5"" %a in ('more') do taskkill /f /pid %a", 0, true

' Wait a moment for processes to close
WScript.Sleep 2000

' Run the server using npm start in a hidden window.
' The '0' parameter hides the command window.
' The 'false' parameter makes the script continue without waiting for the command to finish.
WshShell.Run "cmd /c npm start", 0, false

' Give the server a moment to initialize before opening the browser.
WScript.Sleep 5000 ' 5 seconds

' Open the application URL in the default browser.
WshShell.Run "http://localhost:3000"

Set WshShell = Nothing
