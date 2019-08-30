import React, { useEffect, useState } from 'react';

import { Tooltip, Icon } from 'antd';
import request from '@/utils/request';

interface IResObj {
  [key: string]: any;
}

interface IResConclusionWithData {
  conclusion: any[];
  data: any[];
}

type IResReportItem = IResObj | IResConclusionWithData | undefined;

interface IAbnormalValue {
  abnormal: boolean;
  message: string;
  value: string | number;
}

export function useReportItemQuery(apiUrl: string) {
  const [conclusion, setConclusion] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const res: IResReportItem = await request(apiUrl);
      if (res !== undefined) {
        if (res.data) {
          const columns = Object.keys(res.data[0] || {}).map(key => ({
            title: key,
            dataIndex: key,
            key,
            render: (text: any) => {
              if (text.abnormal) {
                return (
                  <div style={{ display: 'flex' }}>
                    <span style={{ color: 'red', marginRight: '8px', whiteSpace: 'pre-wrap' }}>
                      {(text as IAbnormalValue).value}
                    </span>
                    <Tooltip title={(text as IAbnormalValue).message}>
                      <Icon style={{ paddingTop: '2px' }} type="question-circle" />
                    </Tooltip>
                  </div>
                );
              }
              return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
            },
          }));
          const dataArr = (res as IResConclusionWithData).data.map((item, index) => ({
            ...item,
            key: `${index}`,
          }));
          setTableColumns(columns);
          setDataSource(dataArr);
          setConclusion(res.conclusion);
        } else {
          const columns = [
            {
              title: '信息',
              dataIndex: 'field',
              key: 'field',
              render: (text: any) => <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>,
            },
            {
              title: '值',
              dataIndex: 'value',
              key: 'value',
              render: (text: any) => <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>,
            },
          ];
          const dataArr = Object.keys(res).map(key => ({
            field: key,
            value: res[key],
            key,
          }));
          setTableColumns(columns);
          setDataSource(dataArr);
        }
      }
    }

    if (apiUrl !== '') {
      fetchData();
    }
  }, [apiUrl]);

  return [conclusion, tableColumns, dataSource];
}
