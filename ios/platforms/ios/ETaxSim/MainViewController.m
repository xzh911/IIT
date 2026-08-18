/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

#import "MainViewController.h"

@implementation MainViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    [self.launchView setAlpha:1];
}

// 复刻壳适配：WebView 布局在安全区下方（与官方 App 行为一致，
// 页面顶部渐变/搜索栏不被 iOS 状态栏遮挡）
- (void)viewDidLayoutSubviews
{
    [super viewDidLayoutSubviews];
    UIEdgeInsets s = self.view.safeAreaInsets;
    CGFloat top = s.top > 0 ? s.top : 20; // 旧机型无 safeArea 时兜底 20pt
    CGRect b = self.view.bounds;
    self.webView.frame = CGRectMake(0, top, b.size.width, b.size.height - top);
}

@end