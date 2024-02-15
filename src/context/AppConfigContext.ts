/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Context, createContext} from 'react';

export interface AppConfig {
  websiteUrl: string;
  limitResultsForMixes: number;
  defaultSampleDiameter: number;
  maxSampleDiameter: number;
  sampleDiameterSliderMarkValues: number[];
}

export const AppConfigContext: Context<AppConfig> = createContext<AppConfig>({
  websiteUrl: 'https://artistassistapp.com',
  limitResultsForMixes: 5,
  defaultSampleDiameter: 10,
  maxSampleDiameter: 50,
  sampleDiameterSliderMarkValues: [1, 10, 20, 30, 40, 50],
});
