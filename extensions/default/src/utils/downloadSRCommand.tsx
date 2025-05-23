import { utils } from '@ohif/core';
import DownloadSRDialog from '../Components/DownloadSRDialog';

/**
 * Command to download an existing SR or prompt for downloading an SR
 *
 * @param {Object} params - The parameters
 * @param {Object} params.displaySetInstanceUID - The UID of the display set to download
 * @returns {void}
 */
function downloadSRCommand(
  { servicesManager, commandsManager, extensionManager },
  { displaySetInstanceUID, StudyInstanceUID, SeriesInstanceUID, measurementFilter }
) {
  const { displaySetService, uiDialogService, measurementService } = servicesManager.services;

  // If displaySetInstanceUID is provided, download that specific SR
  if (displaySetInstanceUID) {
    const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
    if (!displaySet) {
      console.warn('Display set not found:', displaySetInstanceUID);
      return;
    }

    // Check if it's an SR display set
    if (displaySet.SOPClassUID !== '1.2.840.10008.5.1.4.1.1.88.22') {
      console.warn('Display set is not a structured report:', displaySetInstanceUID);
      return;
    }

    // Get the underlying dataset
    const { instance } = displaySet;

    // Create a blob and download
    if (instance) {
      const blob = new Blob([instance], { type: 'application/dicom' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SR_${displaySet.SeriesNumber || 'unknown'}.dcm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return;
  }

  // If no displaySetInstanceUID is provided, but we have measurementFilter,
  // create a new SR and download it
  if (measurementFilter) {
    const measurementData = measurementService.getMeasurements(measurementFilter);

    if (!measurementData || measurementData.length === 0) {
      console.warn('No measurements found for download');
      return;
    }

    // Show dialog asking if user wants to download
    uiDialogService.show({
      id: 'download-sr-dialog',
      title: 'Download Structured Report',
      content: ({ close }) => {
        return (
          <DownloadSRDialog
            close={close}
            downloadSR={() => {
              // Use the cornerstone-dicom-sr extension's downloadReport command
              commandsManager.runCommand('downloadReport', {
                measurementData,
                additionalFindingTypes: ['ArrowAnnotate'],
                options: {
                  SeriesDescription: 'Downloaded SR',
                  SeriesInstanceUID: SeriesInstanceUID,
                  StudyInstanceUID: StudyInstanceUID,
                },
              });
            }}
          />
        );
      },
    });
  }
}

export default downloadSRCommand;
