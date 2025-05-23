import { DicomMetadataStore } from '../services/DicomMetadataStore/DicomMetadataStore';
import formatPN from './formatPN';

export default function uploadCSVReport(measurementData) {
  if (measurementData.length === 0) {
    // Prevent upload of report with no measurements.
    return;
  }

  const columns = [
    'Patient ID',
    'Patient Name',
    'StudyInstanceUID',
    'SeriesInstanceUID',
    'SOPInstanceUID',
    'Label',
  ];

  const reportMap = {};
  measurementData.forEach(measurement => {
    const { referenceStudyUID, referenceSeriesUID, getReport, uid } = measurement;

    if (!getReport) {
      console.warn('Measurement does not have a getReport function');
      return;
    }

    const seriesMetadata = DicomMetadataStore.getSeries(referenceStudyUID, referenceSeriesUID);

    const commonRowItems = _getCommonRowItems(measurement, seriesMetadata);
    const report = getReport(measurement);

    reportMap[uid] = {
      report,
      commonRowItems,
    };
  });

  // get columns names inside the report from each measurement and
  // add them to the rows array (this way we can add columns for any custom
  // measurements that may be added in the future)
  Object.keys(reportMap).forEach(id => {
    const { report } = reportMap[id];
    report.columns.forEach(column => {
      if (!columns.includes(column)) {
        columns.push(column);
      }
    });
  });

  const results = _mapReportsToRowArray(reportMap, columns);

  let csvContent = results.map(res => res.join(',')).join('\n');

  _uploadFile(csvContent);
}

function _mapReportsToRowArray(reportMap, columns) {
  const results = [columns];
  Object.keys(reportMap).forEach(id => {
    const { report, commonRowItems } = reportMap[id];
    const row = [];
    // For commonRowItems, find the correct index and add the value to the
    // correct row in the results array
    Object.keys(commonRowItems).forEach(key => {
      const index = columns.indexOf(key);
      const value = commonRowItems[key];
      row[index] = value;
    });

    // For each annotation data, find the correct index and add the value to the
    // correct row in the results array
    report.columns.forEach((column, index) => {
      const colIndex = columns.indexOf(column);
      const value = report.values[index];
      row[colIndex] = value;
    });

    results.push(row);
  });

  return results;
}

function _getCommonRowItems(measurement, seriesMetadata) {
  const firstInstance = seriesMetadata.instances[0];

  return {
    'Patient ID': firstInstance.PatientID, // Patient ID
    'Patient Name': formatPN(firstInstance.PatientName) || '', // Patient Name
    StudyInstanceUID: measurement.referenceStudyUID, // StudyInstanceUID
    SeriesInstanceUID: measurement.referenceSeriesUID, // SeriesInstanceUID
    SOPInstanceUID: measurement.SOPInstanceUID, // SOPInstanceUID
    Label: measurement.label || '', // Label
  };
}

function _uploadFile(csvContent) {
  // Access environment variable safely with multiple fallbacks
  let FILE_ENDPOINT = 'http://localhost:55302/FileHandler.ashx';
  // const win = typeof window !== 'undefined' ? window : {};

  // // Try process.env first (available during build)
  // if (typeof process !== 'undefined' && process.env && process.env.APP_FILE_ENDPOINT) {
  //   FILE_ENDPOINT = process.env.APP_FILE_ENDPOINT;
  //   console.log('Found APP_FILE_ENDPOINT in process.env:', FILE_ENDPOINT);
  // } // Try each possible location for the config
  // else if (win.config && win.config.APP_FILE_ENDPOINT) {
  //   FILE_ENDPOINT = win.config.APP_FILE_ENDPOINT;
  //   console.log('Found APP_FILE_ENDPOINT in window.config:', FILE_ENDPOINT);
  // } else if (win.ENV && win.ENV.APP_FILE_ENDPOINT) {
  //   FILE_ENDPOINT = win.ENV.APP_FILE_ENDPOINT;
  //   console.log('Found APP_FILE_ENDPOINT in window.ENV:', FILE_ENDPOINT);
  // } else if (win.appConfig && win.appConfig.APP_FILE_ENDPOINT) {
  //   FILE_ENDPOINT = win.appConfig.APP_FILE_ENDPOINT;
  //   console.log('Found APP_FILE_ENDPOINT in window.appConfig:', FILE_ENDPOINT);
  // }

  // // Check if we have a valid endpoint, otherwise show error and return
  // if (!FILE_ENDPOINT) {
  //   console.error(
  //     'No APP_FILE_ENDPOINT found. Please configure the APP_FILE_ENDPOINT in your application config.'
  //   );
  //   alert('File upload failed: Server endpoint not configured. Please contact your administrator.');
  //   return;
  // }

  // Get eventidentifier from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const eventIdentifier = urlParams.get('eventidentifier');

  // Create URL with eventidentifier parameter if it exists
  const uploadUrl = eventIdentifier
    ? `${FILE_ENDPOINT}?eventidentifier=${encodeURIComponent(eventIdentifier)}`
    : FILE_ENDPOINT;

  console.log('Using upload URL with eventidentifier:', uploadUrl);

  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv' });

  // Create FormData and append the file
  const formData = new FormData();
  formData.append('file', blob, 'MeasurementReport.csv');

  // Post the data to the API endpoint
  fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type header when using FormData, browser will set it automatically with the boundary
      Accept: 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('CSV file uploaded successfully:', data);
    })
    .catch(error => {
      console.error('Error uploading CSV file:', error);
    });
}
