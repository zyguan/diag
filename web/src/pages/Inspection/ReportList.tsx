import React, { useMemo, useState } from 'react';
import { Table, Button, Divider, Modal, Tooltip, Icon } from 'antd';
import { connect } from 'dva';
import { Link } from 'umi';
import { PaginationConfig } from 'antd/lib/table';
import { ConnectState, ConnectProps, InspectionModelState, Dispatch } from '@/models/connect';
import { IFormatInspection, IInspection } from '@/models/inspection';
import UploadRemoteReportModal from '@/components/UploadRemoteReportModal';
import { CurrentUser } from '@/models/user';
import UploadLocalReportModal from '@/components/UploadLocalReportModal';
import ConfigInstanceModal from '@/components/ConfigInstanceModal';
import { useIntervalRun } from '@/custom-hooks/use-interval-run';

const styles = require('../style.less');

function getReportDetailLink(instanceId: string | undefined, reportId: string) {
  return instanceId === undefined
    ? `/inspection/reports/${reportId}`
    : `/inspection/instances/${instanceId}/reports/${reportId}`;
}

const tableColumns = (
  curUser: CurrentUser,
  onDelete: any,
  onUpload: any,
  instanceId: string | undefined,
) => {
  const columns = [
    {
      title: '诊断报告 ID',
      dataIndex: 'uuid',
      key: 'uuid',
    },
    {
      title: '用户名',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: '实例名称',
      dataIndex: 'instance_name',
      key: 'instance_name',
    },
    {
      title: '集群版本',
      dataIndex: 'cluster_version',
      key: 'cluster_version',
    },
    {
      title: '诊断方式',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '开始时间',
      dataIndex: 'format_create_time',
      key: 'format_create_time',
      render: (text: any) => (text === 'Invalid date' ? '获取中...' : text),
    },
    {
      title: '完成时间',
      dataIndex: 'format_finish_time',
      key: 'format_finish_time',
      render: (text: any, record: IFormatInspection) => {
        if (record.status === 'exception') {
          return (
            <div className={styles.instance_status}>
              <span style={{ color: 'red' }}>exception</span>
              <Tooltip title={record.message}>
                <Icon type="question-circle" />
              </Tooltip>
            </div>
          );
        }
        if (record.status === 'running') {
          return <span>running</span>;
        }
        return <span>{text}</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (text: any, record: IFormatInspection) => (
        <span>
          {record.status === 'success' ? (
            <Link to={getReportDetailLink(instanceId, record.uuid)}>详情</Link>
          ) : (
            <span>详情</span>
          )}
          {curUser.role === 'admin' && (
            <React.Fragment>
              <Divider type="vertical" />
              {record.status === 'success' ? (
                <a download href={`/api/v1/inspections/${record.uuid}.tar.gz`}>
                  下载
                </a>
              ) : (
                <span>下载</span>
              )}
              {curUser.ka && (
                <React.Fragment>
                  <Divider type="vertical" />
                  {record.status === 'success' ? (
                    <a onClick={() => onUpload(record)}>上传</a>
                  ) : (
                    <span>上传</span>
                  )}
                </React.Fragment>
              )}
            </React.Fragment>
          )}
          <Divider type="vertical" />
          <a style={{ color: 'red' }} onClick={() => onDelete(record)}>
            删除
          </a>
        </span>
      ),
    },
  ];

  if (curUser.role === 'admin') {
    return columns.filter(col => col.dataIndex !== 'cluster_version');
  }
  return columns;
};

interface ReportListProps extends ConnectProps {
  dispatch: Dispatch;

  curUser: CurrentUser;
  inspection: InspectionModelState;
  loading: boolean;
}

function ReportList({ dispatch, curUser, inspection, match, loading }: ReportListProps) {
  const instanceId: string | undefined = match && match.params && (match.params as any).id;

  const [configModalVisible, setConfigModalVisible] = useState(false);

  const [uploadRemoteModalVisible, setUploadRemoteModalVisible] = useState(false);
  const [remoteUploadUrl, setRemoteUploadUrl] = useState('');

  const [uploadLocalModalVisible, setUploadLocalModalVisible] = useState(false);

  const pagination: PaginationConfig = useMemo(
    () => ({
      total: inspection.total_inspections,
      current: inspection.cur_inspections_page,
    }),
    [inspection.cur_inspections_page, inspection.total_inspections],
  );

  useIntervalRun(fetchInspections);

  function fetchInspections(page?: number) {
    dispatch({
      type: 'inspection/fetchInspections',
      payload: {
        page,
        instanceId,
      },
    });
  }

  const columns = useMemo(
    () => tableColumns(curUser, deleteInspection, uploadInspection, instanceId),
    [curUser],
  );

  function deleteInspection(record: IFormatInspection) {
    Modal.confirm({
      title: '删除报告？',
      content: '你确定要删除这个报告吗？删除后不可恢复',
      okText: '删除',
      okButtonProps: { type: 'danger' },
      onOk() {
        dispatch({
          type: 'inspection/deleteInspection',
          payload: record.uuid,
        });
      },
    });
  }

  function uploadInspection(record: IFormatInspection) {
    setUploadRemoteModalVisible(true);
    setRemoteUploadUrl(`/inspections/${record.uuid}`);
  }

  function handleTableChange(curPagination: PaginationConfig) {
    fetchInspections(curPagination.current as number);
  }

  function handleLocalFileUploaded(res: IInspection) {
    dispatch({
      type: 'inspection/saveInspection',
      payload: res,
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.list_header}>
        <h2>诊断报告列表</h2>
        {curUser.role === 'admin' && (
          <Button type="primary" onClick={() => setConfigModalVisible(true)}>
            手动一键诊断
          </Button>
        )}
        {curUser.role === 'dba' && (
          <Button type="primary" onClick={() => setUploadLocalModalVisible(true)}>
            + 导入本地报告
          </Button>
        )}
      </div>
      <Table
        loading={loading}
        dataSource={inspection.inspections}
        columns={columns}
        onChange={handleTableChange}
        pagination={pagination}
      />
      <ConfigInstanceModal
        dispatch={dispatch}
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
        manual
        instanceId={instanceId || ''}
      />
      <UploadRemoteReportModal
        visible={uploadRemoteModalVisible}
        onClose={() => setUploadRemoteModalVisible(false)}
        uploadUrl={remoteUploadUrl}
      />
      <UploadLocalReportModal
        visible={uploadLocalModalVisible}
        onClose={() => setUploadLocalModalVisible(false)}
        actionUrl="/api/v1/inspections"
        onData={handleLocalFileUploaded}
      />
    </div>
  );
}

export default connect(({ user, inspection, loading }: ConnectState) => ({
  curUser: user.currentUser,
  inspection,
  loading: loading.effects['inspection/fetchInspections'],
}))(ReportList);
