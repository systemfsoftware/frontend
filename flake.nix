{
  description = "starter toolchain — the formatter, runtimes, and dependency sandbox the check chain shells out to";

  nixConfig = {
    extra-substituters = "https://nix.systemfsoftware.com";
    extra-trusted-public-keys = "nix-cache-1:wXA8I4DayNW9q6enUyQA/P/nT38pGSTLt374t3gsn7M=";
  };

  inputs = {
    # Follows systemfsoftware's nixpkgs, which carries no `follows` of its own.
    nixpkgs.follows = "systemfsoftware/nixpkgs";
    comment-checker = {
      url = "github:systemfsoftware/comment-checker";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # mkPnpmConsumerStore and mkPnpmWorkspacePackages: the pnpm store and the package tarballs.
    pnpm-release-management = {
      url = "github:systemfsoftware/pnpm-release-management/ebebdfebf30205b508840ea55801d55283af7648";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.comment-checker.follows = "comment-checker";
      inputs.importPnpmLock.follows = "importPnpmLock";
    };
    systemfsoftware.url = "github:systemfsoftware/systemfsoftware/d4aca35674f015b33748891e6378b33a055d1234";
    # The pnpm store is hashless: each tarball's lockfile integrity is its fetch hash, so a lockfile change needs no hash edit.
    importPnpmLock = {
      url = "github:Scrumplex/importPnpmLock.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, comment-checker, pnpm-release-management, systemfsoftware, importPnpmLock }:
    let
      lib = nixpkgs.lib;
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forEachSystem = fn: lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});

      # The lockfile, the workspace doc and every manifest: all the consumer store reads.
      consumerSrc = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./pnpm-lock.yaml
          ./pnpm-workspace.yaml
          (lib.fileset.fileFilter (file: file.name == "package.json") ./.)
        ];
      };

      workspaceOf = pkgs:
        removeAttrs (pnpm-release-management.lib.mkPnpmWorkspacePackages {
          inherit pkgs;
          src = self;
          pname = "starter";
          pnpm = pkgs.pnpm_12;
        }) [ "pnpm-store" "mitmCache" ];
    in
    {
      packages = forEachSystem (pkgs:
        let
          system = pkgs.stdenv.hostPlatform.system;
          dprint = pkgs.callPackage ./nix/dprint.nix { dprintConfig = ./dprint.json; };
          unwrapped = comment-checker.packages.${system}.comment-checker;
          sandboxed = pkgs.callPackage ./nix/comment-checker-sandbox.nix {
            comment-checker = unwrapped;
          };
          sandbox = pkgs.callPackage "${pnpm-release-management}/nix/sandbox/default.nix" { };
          workspace = workspaceOf pkgs;
          own = {
            inherit dprint sandbox;
            pnpm-store = pnpm-release-management.lib.mkPnpmConsumerStore {
              inherit pkgs;
              src = consumerSrc;
            };
            sandbox-proofs = (pkgs.callPackage "${pnpm-release-management}/nix/sandbox/proofs.nix" {
              inherit pkgs sandbox;
              inherit (importPnpmLock.legacyPackages.${system}) iplConfigHook;
            }).sandbox-proofs;
            comment-checker = sandboxed;
            comment-checker-unwrapped = unwrapped;
            default = dprint;
          };
          clashes = builtins.attrNames (builtins.intersectAttrs own workspace);
        in
        assert clashes == [ ] || throw "flake.nix: workspace packages ${lib.concatStringsSep ", " clashes} collide with flake packages";
        workspace // own);

      devShells = forEachSystem (pkgs:
        let
          own = self.packages.${pkgs.stdenv.hostPlatform.system};
          playwrightBrowsers = pkgs.playwright-driver.browsers.override {
            withChromium = false;
            withFirefox = false;
            withWebkit = false;
            withFfmpeg = false;
          };
          # Without a font configuration the sandboxed browser lays text out
          # at zero height, so a visibility assertion on text fails.
          fontsConf = pkgs.makeFontsConf { fontDirectories = [ pkgs.dejavu_fonts ]; };
          # The launcher reads only store paths on PATH, the command and the
          # pnpm store, so a bare --pass-env cannot carry the browsers or the
          # font configuration in. A PATH entry whose closure reaches them
          # makes those store paths readable.
          playwrightBrowsersAnchor = pkgs.writeShellApplication {
            name = "playwright-browsers-anchor";
            runtimeInputs = [ playwrightBrowsers ];
            text = ": ${fontsConf}";
          };
        in {
        default = pkgs.mkShell {
          packages = [
            own.dprint
            own.comment-checker
            own.sandbox
            pnpm-release-management.packages.${pkgs.stdenv.hostPlatform.system}.release-tools
            pkgs.actionlint
            pkgs.nodejs_24
            pkgs.pnpm_12
            pkgs.deno
          ] ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ playwrightBrowsersAnchor ];
          SANDBOX_PNPM_STORE = own.pnpm-store;
          shellHook = ''
            git config core.hooksPath .husky
          '';
          env = pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
            PLAYWRIGHT_BROWSERS_PATH = "${playwrightBrowsers}";
            FONTCONFIG_FILE = "${fontsConf}";
          };
        };
      });
    };
}
