/* eslint-disable fsd/no-function-declaration-in-event-listener */
import $ from 'jquery';
import SliderView from '../view';
import SliderBar from '../../bar/bar';
import SliderScale from '../../scale/scale';
import SliderRunner from '../../runner/runner';

const mockBarUpdate = jest.fn();
const mockBarDestroy = jest.fn();

jest.mock('../../bar/bar', jest.fn(() => jest.fn().mockImplementation(() => ({
  update: mockBarUpdate,
  destroy: mockBarDestroy,
}))));

const mockScaleUpdate = jest.fn();
const mockScaleDestroy = jest.fn();

jest.mock('../../scale/scale', jest.fn(() => jest.fn().mockImplementation(() => ({
  update: mockScaleUpdate,
  destroy: mockScaleDestroy,
}))));

const mockRunnerUpdate = jest.fn();
const mockRunnerDestroy = jest.fn();

jest.mock('../../runner/runner', jest.fn(() => jest.fn().mockImplementation(() => ({
  update: mockRunnerUpdate,
  destroy: mockRunnerDestroy,
}))));

describe('SliderView', () => {
  document.body.innerHTML = '<div id="container"></div>';

  const testNode = document.getElementById('container');
  const testOptions: View.Options = {
    isHorizontal: true,
    range: true,
    dragInterval: true,
    runner: true,
    bar: true,
    scale: true,
    scaleStep: 25,
    displayScaleValue: true,
    displayValue: true,
    displayMin: true,
    displayMax: true,
    prefix: 'value',
    postfix: '$',
  };
  const testRenderData: View.RenderData = {
    data: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    percentageData: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    value: [10, 30],
    percentage: [20, 60],
  };

  HTMLElement.prototype.getBoundingClientRect = (): DOMRect => ({
    x: 0,
    y: 0,
    height: 100,
    width: 100,
    bottom: 100,
    left: 0,
    right: 100,
    top: 0,
    toJSON: (): void => {},
  });

  const mockUpdate = jest.fn();
  const mockStart = jest.fn();
  const mockChange = jest.fn();
  const mockFinish = jest.fn();

  let testView: SliderView;
  let testObserver: View.Observer;

  beforeEach(() => {
    testView = new SliderView(testNode, testOptions);
    testObserver = {
      update: mockUpdate,
      start: mockStart,
      change: mockChange,
      finish: mockFinish,
    };
  });

  afterEach(() => {
    testView.destroy();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should set props: $container, options', () => {
      expect(testView).toHaveProperty('$container', $(testNode));
      expect(testView).toHaveProperty('viewOptions', testOptions);
    });

    test('should create empty Set object this.observers', () => {
      expect(testView).toHaveProperty('observers');

      const entries = Object.entries(testView);
      entries.forEach((entry) => {
        if (entry[0] === 'observers') {
          const observers: Set<View.Observer> = entry[1];
          expect(observers.size).toEqual(0);
        }
      });
    });

    test('should create $view', () => {
      expect(testView).toHaveProperty('$view');
    });

    test('should create bar instance', () => {
      expect(testOptions.bar).toBeTruthy();
      expect(testView).toHaveProperty('bar');
      expect(SliderBar).toBeCalledTimes(1);
    });

    test('should create runner instance, if options.runner is true', () => {
      expect(testOptions.runner).toBeTruthy();
      expect(testView).toHaveProperty('runner');
      expect(SliderRunner).toBeCalledTimes(2);
    });

    test('should create scale instance, if options.scale is true', () => {
      expect(testOptions.scale).toBeTruthy();
      expect(testView).toHaveProperty('scale');
      expect(SliderScale).toBeCalledTimes(1);
    });

    test('should create second runner instance, if options.range and options.runner is true', () => {
      expect(testOptions.runner).toBeTruthy();
      expect(testOptions.range).toBeTruthy();
      expect(testView).toHaveProperty('secondRunner');
      expect(SliderRunner).toBeCalledTimes(2);
    });

    test('should reset isRendered flag to false', () => {
      expect(testView).toHaveProperty('isRendered', false);
    });
  });

  describe('getData', () => {
    test('should return view data', () => {
      expect(testView.getData()).toEqual(testOptions);
    });
  });

  describe('render', () => {
    const $container = $('#container');

    beforeEach(() => {
      testView.addObserver(testObserver);
    });

    test('should save render data to this.renderData', () => {
      expect(testView).not.toHaveProperty('renderData');
      testView.render(testRenderData);
      expect(testView).toHaveProperty('renderData', testRenderData);
    });

    test('should append $view to container if isRendered is false', () => {
      expect(testView).toHaveProperty('isRendered', false);
      expect($container.find('.js-slider__container').length).toBe(0);
      testView.render(testRenderData);
      expect($container.find('.js-slider__container').length).toBe(1);
    });

    test('should set isRendered flag to true', () => {
      expect(testView).toHaveProperty('isRendered', false);
      testView.render(testRenderData);
      expect(testView).toHaveProperty('isRendered', true);
    });

    test('should attach event handlers to $view', () => {
      const $startEvent = $.Event('startChanging.myMVPSlider');
      const $changeEvent = $.Event('changeValue.myMVPSlider');
      const $finishEvent = $.Event('finish.myMVPSlider');
      const $dragRangeEvent = $.Event('dragRange.myMVPSlider');
      const $dropEvent = $.Event('dropRange.myMVPSlider');

      testView.render(testRenderData);

      const $view = $container.find('.js-slider__container');

      $view.trigger($startEvent);
      $view.trigger($changeEvent, [30, false]); // value: 30, isSecond: false
      $view.trigger($finishEvent, [30, false]); // value: 30, isSecond: false
      expect(mockStart).toBeCalled();
      expect(mockChange).toBeCalledWith([30, 60]);
      expect(mockFinish).toBeCalledWith([30, 60]);

      // drag and drop interval
      jest.clearAllMocks();
      $view.trigger($startEvent, [true]); // isDragStart is true
      $view.trigger($dragRangeEvent, [20]);
      $view.trigger($dropEvent, [20]);

      // [20+20, 60+20] = [40, 80]
      expect(mockChange).toBeCalledWith([40, 80]);
      expect(mockFinish).toBeCalledWith([40, 80]);
    });

    test('should update bar, scale, runner, secondRunner', () => {
      testView.render(testRenderData);
      expect(mockBarUpdate).toBeCalledTimes(1);
      expect(mockScaleUpdate).toBeCalledTimes(1);
      expect(mockRunnerUpdate).toBeCalledTimes(2);
    });
  });

  describe('update', () => {
    test('should update this.viewOptions', () => {
      testView.update({ isHorizontal: false });
      expect(testView.getData().isHorizontal).toBe(false);

      testView.update({
        bar: false,
        scale: false,
      });

      expect(testView.getData()).toEqual({
        isHorizontal: false,
        range: true,
        dragInterval: true,
        runner: true,
        bar: false,
        scale: false,
        scaleStep: 25,
        displayScaleValue: true,
        displayValue: true,
        displayMin: true,
        displayMax: true,
        prefix: 'value',
        postfix: '$',
      });
    });

    test('should validate data', () => {
      testView.update({
        isHorizontal: undefined,
        range: undefined,
        dragInterval: undefined,
        runner: undefined,
        bar: undefined,
        scale: undefined,
        scaleStep: -25,
        displayScaleValue: undefined,
        displayValue: undefined,
        displayMin: undefined,
        displayMax: undefined,
        prefix: undefined,
        postfix: undefined,
      });

      testView.update({
        isHorizontal: null,
        range: null,
        dragInterval: null,
        runner: null,
        bar: null,
        scale: null,
        scaleStep: 0,
        displayScaleValue: null,
        displayValue: null,
        displayMin: null,
        displayMax: null,
        prefix: null,
        postfix: null,
      });

      testView.update({ scaleStep: NaN });

      expect(testView.getData()).toEqual({
        isHorizontal: true,
        range: true,
        dragInterval: true,
        runner: true,
        bar: true,
        scale: true,
        scaleStep: 25,
        displayScaleValue: true,
        displayValue: true,
        displayMin: true,
        displayMax: true,
        prefix: 'value',
        postfix: '$',
      });
    });

    test('should update bar, scale, runner and secondRunner', () => {});

    test('should destroy bar,if options.bar is false', () => {});

    test('should destroy scale,if options.scale is false', () => {});

    test('should destroy runner,if options.runner is false', () => {});

    test('should destroy secondRunner,if options.range or runner are false', () => {});

    test('should re-render view with current renderData', () => {});
  });

  describe('addObserver', () => {
    test('should added observer to this.observers', () => {
      testView.addObserver(testObserver);

      const entries = Object.entries(testView);
      entries.forEach((entry) => {
        if (entry[0] === 'observers') {
          const observers: Set<View.Observer> = entry[1];
          expect(observers.has(testObserver)).toBeTruthy();
        }
      });
    });
  });

  describe('removeObserver', () => {
    test('should removed observer from this.observers', () => {
      testView.addObserver(testObserver);

      let entries = Object.entries(testView);
      entries.forEach((entry) => {
        if (entry[0] === 'observers') {
          const observers: Set<View.Observer> = entry[1];
          expect(observers.has(testObserver)).toBeTruthy();
        }
      });

      testView.removeObserver(testObserver);

      entries = Object.entries(testView);
      entries.forEach((entry) => {
        if (entry[0] === 'observers') {
          const observers: Set<View.Observer> = entry[1];
          expect(observers.has(testObserver)).toBeFalsy();
        }
      });
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      testView.render(testRenderData);
    });

    test('should call destroy methods of SliderBar, SliderScale, SliderRunner', () => {
      testView.destroy();
      expect(mockBarDestroy).toBeCalledTimes(1);
      expect(mockScaleDestroy).toBeCalledTimes(1);
      expect(mockRunnerDestroy).toBeCalledTimes(2);
    });

    test('should detach event listeners', () => {
      const $startEvent = $.Event('startChanging.myMVPSlider');
      const $changeEvent = $.Event('changeValue.myMVPSlider');
      const $finishEvent = $.Event('finish.myMVPSlider');
      const $dragRangeEvent = $.Event('dragRange.myMVPSlider');
      const $dropEvent = $.Event('dropRange.myMVPSlider');

      const $view = $(testNode).find('.js-slider__container');
      testView.destroy();

      $view.trigger($startEvent);
      $view.trigger($changeEvent);
      $view.trigger($finishEvent);
      $view.trigger($dragRangeEvent);
      $view.trigger($dropEvent);

      expect(mockStart).not.toBeCalled();
      expect(mockChange).not.toBeCalled();
      expect(mockFinish).not.toBeCalled();
    });

    test('should remove $view', () => {
      expect($(testNode).find('.js-slider__container').length).toBe(1);
      testView.destroy();
      expect($(testNode).find('.js-slider__container').length).toBe(0);
    });

    test('should reset isRendered flag to false', () => {
      expect(testView).toHaveProperty('isRendered', true);
      testView.destroy();
      expect(testView).toHaveProperty('isRendered', false);
    });
  });
});
