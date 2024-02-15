/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FullscreenExitOutlined,
  FullscreenOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type {TabsProps} from 'antd';
import {Alert, App, Button, Col, FloatButton, Row, Tabs, Tooltip, theme} from 'antd';
import {useCallback, useEffect, useRef, useState} from 'react';
import StickyBox from 'react-sticky-box';
import {useEventListener, useTimeout} from 'usehooks-ts';
import {useCreateImageBitmap} from '../hooks/useCreateImageBitmap';
import {useFullScreen} from '../hooks/useFullscreen';
import {
  OFF_WHITE_HEX,
  PENCIL_TYPES,
  PaintMix,
  PaintSet,
  UrlParsingResult,
  parseUrl,
} from '../services/color';
import {Rgb, RgbTuple} from '../services/color/model';
import {IMAGE_SIZE, createScaledImageBitmap} from '../utils';
import {ImageColorPicker} from './ImageColorPicker';
import {ImageGrid} from './ImageGrid';
import {ImageSelect} from './ImageSelect';
import {ImageSketch} from './ImageSketch';
import {ImageTonalValues} from './ImageTonalValues';
import {PaintMixer} from './PaintMixer';
import {PaintSetSelect} from './PaintSetSelect';
import {Palette} from './Palette';
import {AboutModal} from './modal/AboutModal';
import {TabKey} from './types';

const isBrowserSupported =
  typeof Worker !== 'undefined' &&
  typeof OffscreenCanvas !== 'undefined' &&
  typeof createImageBitmap !== 'undefined' &&
  typeof indexedDB !== 'undefined';

const {paintSet: importedPaintSet, paintMix: importedPaintMix}: UrlParsingResult = parseUrl(
  window.location.toString()
);
if (importedPaintSet || importedPaintMix) {
  history.pushState({}, '', '/');
}

const blobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> => {
  return [await createScaledImageBitmap(blob, IMAGE_SIZE['2K'])];
};

export const ArtistAssistApp: React.FC = () => {
  const {
    token: {colorBgContainer},
  } = theme.useToken();

  const {message} = App.useApp();

  const {isFullscreen, toggleFullScreen} = useFullScreen();

  const [activeTabKey, setActiveTabKey] = useState<TabKey>(TabKey.Paints);
  const [paintSet, setPaintSet] = useState<PaintSet | undefined>();
  const [blob, setBlob] = useState<Blob | undefined>();
  const [imageFileId, setImageFileId] = useState<number | undefined>();
  const [backgroundColor, setBackgroundColor] = useState<string>(OFF_WHITE_HEX);
  const [isGlaze, setIsGlaze] = useState<boolean>(false);
  const [paintMixes, setPaintMixes] = useState<PaintMix[] | undefined>();
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  const {images, isLoading: isImagesLoading} = useCreateImageBitmap(
    blobToImageBitmapsConverter,
    blob
  );

  const importPaintMixWaitingRef = useRef<boolean>(true);

  useTimeout(() => (importPaintMixWaitingRef.current = false), 1000);

  useEffect(() => {
    if (importedPaintMix && importPaintMixWaitingRef.current) {
      setActiveTabKey(TabKey.Palette);
    } else {
      if (!paintSet) {
        setActiveTabKey(TabKey.Paints);
      } else if (!blob) {
        setActiveTabKey(TabKey.Photo);
      } else {
        setActiveTabKey(TabKey.Colors);
        message.info('🔎 Pinch to zoom (or use the mouse wheel) and drag to pan');
      }
    }
  }, [paintSet, blob, message]);

  useEventListener('beforeunload', event => {
    event.returnValue = 'Are you sure you want to leave?';
  });

  const setAsBackground = useCallback(
    (background: string | RgbTuple) => {
      setBackgroundColor(Rgb.fromHexOrTuple(background).toHex());
      setIsGlaze(true);
      setActiveTabKey(TabKey.Colors);
    },
    [setBackgroundColor, setIsGlaze]
  );

  const showAboutModal = () => {
    setIsAboutModalOpen(true);
  };

  const handleTabChange = (activeKey: string) => {
    setActiveTabKey(activeKey as TabKey);
  };

  const items = [
    {
      key: TabKey.Paints,
      label: 'Paints',
      children: <PaintSetSelect setPaintSet={setPaintSet} importedPaintSet={importedPaintSet} />,
      forceRender: true,
    },
    {
      key: TabKey.Photo,
      label: 'Photo',
      children: (
        <ImageSelect setBlob={setBlob} imageFileId={imageFileId} setImageFileId={setImageFileId} />
      ),
      forceRender: true,
    },
    {
      key: TabKey.Colors,
      label: 'Colors',
      children: (
        <ImageColorPicker
          paintSet={paintSet}
          imageFileId={imageFileId}
          images={images}
          isImagesLoading={isImagesLoading}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          isGlaze={isGlaze}
          setIsGlaze={setIsGlaze}
          paintMixes={paintMixes}
          setPaintMixes={setPaintMixes}
          setAsBackground={setAsBackground}
        />
      ),
      forceRender: true,
      disabled: !paintSet,
    },
    {
      key: TabKey.Palette,
      label: 'Palette',
      children: (
        <Palette
          paintSet={paintSet}
          imageFileId={imageFileId}
          paintMixes={paintMixes}
          setPaintMixes={setPaintMixes}
          setAsBackground={setAsBackground}
          importedPaintMix={importedPaintMix}
          blob={blob}
        />
      ),
      forceRender: true,
    },
    {
      key: TabKey.TonalValues,
      label: 'Tonal values',
      children: <ImageTonalValues blob={blob} images={images} isImagesLoading={isImagesLoading} />,
      forceRender: true,
      disabled: !blob,
    },
    {
      key: TabKey.Sketch,
      label: 'Sketch',
      children: <ImageSketch blob={blob} />,
      forceRender: true,
      disabled: !blob,
    },
    {
      key: TabKey.Grid,
      label: 'Grid',
      children: <ImageGrid images={images} isImagesLoading={isImagesLoading} />,
      forceRender: true,
      disabled: !blob,
    },
    {
      key: TabKey.ColorMixing,
      label: 'Color mixing',
      children: <PaintMixer paintSet={paintSet} />,
      forceRender: true,
      disabled: !paintSet || PENCIL_TYPES.includes(paintSet.type),
    },
  ];

  const renderTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{zIndex: 10}}>
      <DefaultTabBar {...props} style={{background: colorBgContainer}} />
    </StickyBox>
  );

  if (!isBrowserSupported) {
    return (
      <Alert
        message="Error"
        description={`Your web browser is not supported: ${navigator.userAgent}. Use the latest version of Google Chrome, Firefox, Opera, Samsung Internet or Microsoft Edge to access the web app.`}
        type="error"
        showIcon
        style={{margin: '16px'}}
      />
    );
  }

  return (
    <>
      <Row justify="center">
        <Col xs={24} xxl={18}>
          <Tabs
            renderTabBar={renderTabBar}
            items={items}
            activeKey={activeTabKey}
            onChange={handleTabChange}
            size="large"
            tabBarGutter={0}
            tabBarExtraContent={{
              right: (
                <Tooltip title="Help" placement="left">
                  <Button type="link" icon={<QuestionCircleOutlined />} onClick={showAboutModal} />
                </Tooltip>
              ),
            }}
          />
        </Col>
      </Row>
      <FloatButton
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        shape="square"
        tooltip={isFullscreen ? 'Exit full screen' : 'Full screen'}
        onClick={toggleFullScreen}
        style={{right: 24, bottom: 24}}
      />
      <AboutModal open={isAboutModalOpen} setOpen={setIsAboutModalOpen} />
    </>
  );
};
