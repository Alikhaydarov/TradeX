import type { ComponentProps } from "react"

import { DashboardOverviewPolished } from "./dashboard-overview-polished"
import styles from "./dashboard-overview-responsive.module.css"

type DashboardOverviewProps = ComponentProps<typeof DashboardOverviewPolished>

export function DashboardOverview(props: DashboardOverviewProps) {
  return (
    <div className={styles.root}>
      <DashboardOverviewPolished {...props} />
    </div>
  )
}
