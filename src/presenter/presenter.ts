import SliderModel from '../model/model';

class SliderPresenter implements Presenter {
  private view: View;
  private model: Model;
  private viewObserver: View.Observer;
  private modelObserver: Model.Observer;
  private dataValues: App.Stringable[];
  private renderData: App.Stringable[];
  private isChanging: boolean;
  private callbacks: {
    onStart: CallableFunction;
    onChange: CallableFunction;
    onFinish: CallableFunction;
    onUpdate: CallableFunction;
  };

  constructor(options: Presenter.Options) {
    this.model = options.model;
    this.view = options.view;

    if (options.dataValues !== undefined && options.dataValues.length) {
      this.updateDataValues(options.dataValues);
    } else {
      this.dataValues = [];
    }

    this.renderData = this.dataValues.length > 0 ? this.dataValues : this.createDataValues();

    this.callbacks = {
      onStart: options.onStart,
      onChange: options.onChange,
      onFinish: options.onFinish,
      onUpdate: options.onUpdate,
    };

    this.isChanging = false;

    this.subscribeToModel();
    this.subscribeToView();
    this.renderView();
  }

  update(options: App.Option): void {
    const modelOptions: Model.Options = {
      maxValue: options.maxValue,
      minValue: options.minValue,
      step: options.step,
      value: options.value,
    };

    if (Object.prototype.hasOwnProperty.call(options, 'secondValue')) {
      modelOptions.secondValue = options.secondValue;
    }

    const viewOptions: View.Options = {
      isHorizontal: options.isHorizontal,
      range: options.range,
      dragInterval: options.dragInterval,
      runner: options.runner,
      bar: options.bar,
      scale: options.scale,
      numOfScaleVal: options.numOfScaleVal,
      displayScaleValue: options.displayScaleValue,
      displayValue: options.displayValue,
      displayMin: options.displayMin,
      displayMax: options.displayMax,
      prefix: options.prefix,
      postfix: options.postfix,
    };

    if (!SliderPresenter.isEmpty(modelOptions) || Object.prototype.hasOwnProperty.call(options, 'secondValue')) {
      this.model.updateState(modelOptions);
    }

    if (Object.prototype.hasOwnProperty.call(options, 'lockedValues')) {
      this.model.lockState(options.lockedValues);
    }

    if (Object.prototype.hasOwnProperty.call(options, 'unlockValues')) {
      this.model.unlockState(options.unlockValues);
    }

    if (!SliderPresenter.isEmpty(viewOptions)) {
      this.view.update(viewOptions);
    }

    this.callbacks.onUpdate();
  }

  getAllData(): App.Option {
    const data = {
      ...this.getModelData(),
      ...this.getViewData(),
      ...this.getPresenterData(),
    };
    return data;
  }

  getModelData(): Model.Options {
    return this.model.getState();
  }

  getViewData(): View.Options {
    return this.view.getData();
  }

  getPresenterData(): Presenter.Data {
    return {
      dataValues: this.dataValues,
      renderData: this.renderData,
    };
  }

  setUserData(data: App.Stringable[] | Model.Options): void {
    if (Array.isArray(data) && data.length > 0) {
      this.updateDataValues(data);
      this.renderData = this.dataValues.length > 0 ? this.dataValues : this.createDataValues();
    } else if (!Array.isArray(data) && SliderModel.validateInitOptions(data)) {
      this.dataValues = [];
      this.model.unlockState(['maxValue', 'minValue', 'step']);

      if (Object.prototype.hasOwnProperty.call(data, 'lockedValues')) {
        this.model.lockState(data.lockedValues);
      }

      this.model.updateState(data);
    }
  }

  private createDataValues(data?: Model.Options, options?: View.Options): number[] {
    const {
      minValue: min,
      maxValue: max,
      step,
    } = data || this.model.getState();

    const {
      displayMax = true,
      displayMin = true,
      numOfScaleVal = 10,
    } = options || this.view.getData();

    const values: number[] = [];

    if (displayMin) {
      values.push(min);
    }

    let total: number;
    const num = (max - min) / step;

    if (num % 1 === 0) {
      total = num - 1;
    } else {
      total = Math.floor(num);
    }

    let resultNum: number = numOfScaleVal < total ? numOfScaleVal : total;

    if (resultNum < 0) {
      resultNum = 0;
    }

    if (resultNum > 10) {
      resultNum = 10;
    }

    if (resultNum === total) {
      for (let i = 1; i <= total; i += 1) {
        const elem = min + step * i;
        values.push(elem);
      }
    } else {
      const s = (max - min) / (resultNum + 1);
      for (let i = 1; i <= resultNum; i += 1) {
        const elem = min + s * i;
        let multipleElem: number;
        if ((elem - min) % step > step / 2) {
          multipleElem = elem - ((elem - min) % step) + step;
        } else {
          multipleElem = elem - ((elem - min) % step);
        }
        values.push(multipleElem);
      }
    }

    if (displayMax) {
      values.push(max);
    }

    return values;
  }

  private createPercentageData(): number[] {
    const {
      minValue: min,
      maxValue: max,
      step,
    } = this.model.getState();

    const values = this.createDataValues();
    const baseValue = step / (max - min);

    const percentageData = values.map((val): number => {
      const percentage = ((val - min) / (max - min)) * 100;
      return SliderModel.fixVal(percentage, baseValue);
    });

    return percentageData;
  }

  private subscribeToModel(): void {
    this.modelObserver = {
      update: (): void => {
        const updatedModelState = this.getModelData();
        if (this.dataValues.length > 0) {
          this.renderData = this.dataValues;
        } else {
          this.renderData = this.createDataValues(updatedModelState);
        }

        if (this.isChanging) {
          this.callbacks.onChange(updatedModelState);
        }
        this.renderView();
      },
    };
    this.model.addObserver(this.modelObserver);
  }

  private subscribeToView(): void {
    this.viewObserver = {
      start: (): void => {
        this.callbacks.onStart(this.getModelData());
      },
      change: (values: [number, number] | number): void => {
        this.isChanging = true;
        const convertedValues = this.convertPercentToValue(values);
        if (Array.isArray(convertedValues)) {
          const [newValue, newSecondValue] = convertedValues;
          this.model.updateState({ value: newValue, secondValue: newSecondValue });
        } else {
          this.model.updateState({ value: convertedValues });
        }
      },
      finish: (): void => {
        this.callbacks.onFinish(this.getModelData());
      },
      update: (): void => {
        this.renderData = this.dataValues.length > 0 ? this.dataValues : this.createDataValues();
        this.renderView();
      },
    };
    this.view.addObserver(this.viewObserver);
  }

  private createRenderData(): View.RenderData {
    let value: [App.Stringable, App.Stringable] | App.Stringable;
    let percentage: [number, number] | number;
    const {
      value: from,
      secondValue: to,
    } = this.getModelData();

    if (to !== undefined) {
      if (this.dataValues.length > 0) {
        value = [this.dataValues[from], this.dataValues[to]];
      } else {
        value = [from, to];
      }
      percentage = [this.convertValueToPercent(from), this.convertValueToPercent(to)];
    } else {
      if (this.dataValues.length > 0) {
        value = this.dataValues[from];
      } else {
        value = from;
      }
      percentage = this.convertValueToPercent(from);
    }

    const data = this.renderData;
    const percentageData = this.createPercentageData();
    const viewRenderData: View.RenderData = {
      data,
      percentageData,
      value,
      percentage,
    };

    return viewRenderData;
  }

  private renderView(): void {
    const viewRenderData = this.createRenderData();
    this.view.render(viewRenderData);
  }

  private updateDataValues(values: App.Stringable[]): void {
    this.dataValues = values;
    this.model.updateState({
      maxValue: values.length - 1,
      minValue: 0,
      step: 1,
    });
    this.model.lockState(['maxValue', 'minValue', 'step']);
  }

  private convertPercentToValue(percentage: [number, number] | number): [number, number] | number {
    const { minValue, maxValue } = this.getModelData();
    let value: number;
    let secondValue: number;
    let values: [number, number] | number;

    if (Array.isArray(percentage)) {
      const [firstPercent, secondPercent] = percentage;
      value = ((maxValue - minValue) / 100) * firstPercent + minValue;
      secondValue = ((maxValue - minValue) / 100) * secondPercent + minValue;
      values = [value, secondValue];
    } else {
      values = ((maxValue - minValue) / 100) * percentage + minValue;
    }

    return values;
  }

  private convertValueToPercent(values: number): number {
    const { minValue, maxValue, step } = this.getModelData();
    const baseValue = step / (maxValue - minValue);
    const percentage = ((values - minValue) / (maxValue - minValue)) * 100;
    return SliderModel.fixVal(percentage, baseValue);
  }

  static isEmpty(object: {}): boolean {
    const entries = Object.entries(object);
    let isEmpty = true;

    entries.forEach((entry) => {
      if (entry[1] !== undefined) {
        isEmpty = false;
      }
    });

    return isEmpty;
  }
}

export default SliderPresenter;
