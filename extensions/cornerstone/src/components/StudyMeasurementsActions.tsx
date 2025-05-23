import React from 'react';
import { Button, Icons } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';

interface StudyMeasurementsActionsProps {
  items?: Array<Record<string, unknown>>;
  StudyInstanceUID?: string;
  measurementFilter?: Record<string, unknown>;
  actions?: {
    createSR?: (params: {
      StudyInstanceUID: string;
      measurementFilter: Record<string, unknown>;
    }) => void;
    onDelete?: () => void;
  };
}

export function StudyMeasurementsActions({
  items,
  StudyInstanceUID,
  measurementFilter,
  actions,
}: StudyMeasurementsActionsProps) {
  const { commandsManager } = useSystem();
  const disabled = !items?.length;

  if (disabled) {
    return null;
  }
  return (
    <div className="bg-background flex h-9 w-full items-center rounded pr-0.5">
      <div className="flex space-x-1">
        <Button
          size="sm"
          variant="ghost"
          className="pl-1.5"
          onClick={() => {
            commandsManager.runCommand('uploadCSVMeasurementsReport', {
              StudyInstanceUID,
              measurementFilter,
            });

            commandsManager.runCommand('downloadReport', {
              measurementData: items,
              additionalFindingTypes: ['ArrowAnnotate'],
              options: {
                SeriesDescription: 'Measurements Report',
              },
            });
          }}
        >
          <Icons.Upload className="h-5 w-5" />
          <span className="pl-1">Save Measurements</span>
        </Button>
        {/*
        <Button
          size="sm"
          variant="ghost"
          className="pl-1.5"
          onClick={() => {
            // Download SR report directly
            commandsManager.runCommand('downloadReport', {
              measurementData: items,
              additionalFindingTypes: ['ArrowAnnotate'],
              options: {
                SeriesDescription: 'Measurements Report',
              },
            });
          }}
        >
          <Icons.Download className="h-5 w-5" />
          <span className="pl-1">Download SR</span>
        </Button> */}

        {/* <Button
          size="sm"
          variant="ghost"
          className="pl-0.5"
          onClick={e => {
            e.stopPropagation();
            if (actions?.createSR) {
              actions.createSR({ StudyInstanceUID, measurementFilter });
              return;
            }
            commandsManager.run('promptSaveReport', {
              StudyInstanceUID,
              measurementFilter,
            });
          }}
        >
          <Icons.Add />
          Create SR
        </Button> */}
      </div>
    </div>
  );
}

export default StudyMeasurementsActions;
