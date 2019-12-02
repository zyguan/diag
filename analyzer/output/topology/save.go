package topology

import (
	"github.com/pingcap/tidb-foresight/analyzer/boot"
	"github.com/pingcap/tidb-foresight/analyzer/input/topology"
	"github.com/pingcap/tidb-foresight/model"
	ts "github.com/pingcap/tidb-foresight/utils/tagd-value/string"
	log "github.com/sirupsen/logrus"
)

type saveTopologyTask struct{}

// SaveTopology returns an instance of saveTopologyTask
func SaveTopologyInfo() *saveTopologyTask {
	return &saveTopologyTask{}
}

func (t *saveTopologyTask) Run(c *boot.Config, topo *model.Topology, m *boot.Model, d *topology.ParseStatusDone) {
	for _, host := range topo.Hosts {
		for _, comp := range host.Components {
			status := ts.New(comp.Status, nil)
			switch comp.Status {
			case "offline":
				status.SetTag("status", "error")
			case "unknown":
				// if node status is unknown, it must not be set
				log.Warn("Node status we got is 'unknown'.")
				// TODO: use warning
				status.SetTag("status", "error")
			}
			if err := m.InsertInspectionTopologyInfo(&model.TopologyInfo{
				InspectionId: c.InspectionId,
				NodeIp:       host.Ip,
				Port:         comp.Port,
				Name:         comp.Name,
				Status:       status,
			}); err != nil {
				log.Error("save topology info:", err)
			}
		}
	}
}
