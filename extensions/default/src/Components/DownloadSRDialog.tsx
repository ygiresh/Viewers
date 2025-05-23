import React from 'react';
import { Button } from '@ohif/ui-next';

/**
 * Creates a dialog component that allows downloading of an SR file
 * @param {Object} props - Component props
 * @param {Function} props.close - Function to close the dialog
 * @param {Function} props.downloadSR - Function to trigger the SR download
 */
function DownloadSRDialog({ close, downloadSR }) {
  return (
    <div className="p-4">
      <p className="mb-4">Would you like to download the Structured Report (SR) file?</p>
      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={close}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            downloadSR();
            close();
          }}
        >
          Download
        </Button>
      </div>
    </div>
  );
}

export default DownloadSRDialog;
