import type { ComponentProps } from "react"

import { DashboardOverviewMobile } from "./dashboard-overview-mobile"
import styles from "./dashboard-overview-mobile.module.css"
import { DashboardOverviewResponsive } from "./dashboard-overview-responsive"

type DashboardOverviewProps = ComponentProps<typeof DashboardOverviewResponsive>

export function DashboardOverview(props: DashboardOverviewProps) {
  return (
    <>
      <div className={`${styles.mobileRoot} lg:hidden`}>
        <DashboardOverviewMobile {...props} />
      </div>
      <div className="hidden lg:block">
        <DashboardOverviewResponsive {...props} />
      </div>
    </>
  )
}
