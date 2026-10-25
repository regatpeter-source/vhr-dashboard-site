!macro customInstall
  Delete "$DESKTOP\VHR Dashboard Pro.lnk"
  Delete "$SMPROGRAMS\VHR Dashboard\VHR Dashboard Pro.lnk"
  RMDir "$SMPROGRAMS\VHR Dashboard"
  CopyFiles "$INSTDIR\resources\check-adb.bat" "$INSTDIR"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\VHR Dashboard Pro.lnk"
  Delete "$SMPROGRAMS\VHR Dashboard\VHR Dashboard Pro.lnk"
  RMDir "$SMPROGRAMS\VHR Dashboard"
  Delete "$INSTDIR\check-adb.bat"
!macroend
