import { utils } from '@ohif/core';
import React from 'react';

import createReportAsync from '../Actions/createReportAsync';
import { createReportDialogPrompt } from '../Panels';
import PROMPT_RESPONSES from './_shared/PROMPT_RESPONSES';
import { getSRSeriesAndInstanceNumber } from './getSRSeriesAndInstanceNumber';
import { getSeriesDateTime } from './getCurrentDicomDateTime';

const {
  filterAnd,
  filterMeasurementsByStudyUID,
  filterMeasurementsBySeriesUID,
  filterPlanarMeasurement,
} = utils.MeasurementFilters;

async function promptSaveReport({ servicesManager, commandsManager, extensionManager }, ctx, evt) {
  const { measurementService, displaySetService, uiDialogService } = servicesManager.services;
  const viewportId = evt.viewportId === undefined ? evt.data.viewportId : evt.viewportId;
  const isBackupSave = evt.isBackupSave === undefined ? evt.data.isBackupSave : evt.isBackupSave;
  const StudyInstanceUID = evt?.data?.StudyInstanceUID || ctx.trackedStudy;
  const SeriesInstanceUID = evt?.data?.SeriesInstanceUID;
  const { displaySetInstanceUID } = evt.data ?? evt;

  const {
    trackedSeries,
    measurementFilter = filterAnd(
      filterMeasurementsByStudyUID(StudyInstanceUID),
      filterMeasurementsBySeriesUID(trackedSeries),
      filterPlanarMeasurement
    ),
    defaultSaveTitle = 'Create Report',
  } = ctx;
  let displaySetInstanceUIDs;

  try {
    const promptResult = await createReportDialogPrompt({
      title: defaultSaveTitle,
      extensionManager,
      servicesManager,
    });

    if (promptResult.action === PROMPT_RESPONSES.CREATE_REPORT) {
      const dataSources = extensionManager.getDataSources(promptResult.dataSourceName);
      const dataSource = dataSources[0];
      const measurementData = measurementService.getMeasurements(measurementFilter);

      const SeriesDescription = promptResult.value || defaultSaveTitle;

      const { SeriesNumber, InstanceNumber, referenceDisplaySet } = getSRSeriesAndInstanceNumber({
        displaySetService,
        SeriesInstanceUid: promptResult.series,
      });

      const { SeriesDate, SeriesTime } = referenceDisplaySet ?? getSeriesDateTime();

      const getReport = async () => {
        return commandsManager.runCommand(
          'storeMeasurements',
          {
            measurementData,
            dataSource,
            additionalFindingTypes: ['ArrowAnnotate'],
            options: {
              SeriesDescription,
              SeriesNumber,
              InstanceNumber,
              SeriesInstanceUID: promptResult.series,
              SeriesDate,
              SeriesTime,
            },
          },
          'CORNERSTONE_STRUCTURED_REPORT'
        );
      };

      displaySetInstanceUIDs = await createReportAsync({
        servicesManager,
        getReport,
      });

      // After successful creation, ask if user wants to download the SR
      uiDialogService.show({
        id: 'download-sr-dialog',
        title: 'Download Structured Report',
        content: ({ close }) => {
          return (
            <div className="p-4">
              <p className="mb-4">Would you like to download the Structured Report (SR) file?</p>
              <div className="flex justify-end space-x-2">
                {' '}
                <button
                  className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  className="bg-primary-main hover:bg-primary-dark rounded px-4 py-2 text-white"
                  onClick={() => {
                    // Download the SR
                    commandsManager.runCommand('downloadReport', {
                      measurementData,
                      additionalFindingTypes: ['ArrowAnnotate'],
                      options: {
                        SeriesDescription,
                        SeriesNumber,
                        InstanceNumber,
                        SeriesInstanceUID: promptResult.series,
                        SeriesDate,
                        SeriesTime,
                      },
                    });
                    close();
                  }}
                >
                  Download
                </button>
              </div>
            </div>
          );
        },
      });
    } else if (promptResult.action === PROMPT_RESPONSES.CANCEL) {
      // Do nothing
    }

    return {
      userResponse: promptResult.action,
      createdDisplaySetInstanceUIDs: displaySetInstanceUIDs,
      StudyInstanceUID,
      SeriesInstanceUID,
      viewportId,
      isBackupSave,
      displaySetInstanceUID,
    };
  } catch (error) {
    console.warn('Unable to save report', error);
    return null;
  }
}

export default promptSaveReport;
