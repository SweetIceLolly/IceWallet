export enum FILTER_TYPE {
  DATE = 0,
  AMOUNT = 1,
  DESC = 2,
  ENTRY_DATE = 3
}

export enum FILTER_OPERATOR {
  LT = 0,
  LEQ = 1,
  GT = 2,
  GEQ = 3,
  EQ = 4,
  NEQ = 5,
  CONTAINS = 6,
  NOT_CONTAINS = 7
}

export class SearchFilter {
  constructor() {}

  type: FILTER_TYPE = FILTER_TYPE.DATE;
  operator: FILTER_OPERATOR = FILTER_OPERATOR.LT;
  value: number | string | Date = '';
}
